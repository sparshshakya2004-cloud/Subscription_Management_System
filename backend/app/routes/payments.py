from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.connection import get_db
from backend.app.models.models import Payment, Invoice, Customer, ActivityLog, User
from backend.app.schemas.schemas import PaymentResponse, PaymentCreate
from backend.app.middleware.auth import require_staff_or_admin, get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])

def generate_payment_number(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Payment.id)).scalar() or 0
    return f"PAY-{year}-{count + 1:04d}"

@router.get("", response_model=List[PaymentResponse])
def list_payments(
    invoice_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Payment).join(Invoice).join(Customer)

    # Customer isolation
    if current_user.role.name == "Customer":
        if not current_user.customer:
            return []
        query = query.filter(Payment.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Payment.customer_id == customer_id)

    if invoice_id:
        query = query.filter(Payment.invoice_id == invoice_id)
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)

    payments = query.order_by(Payment.payment_date.desc()).all()
    results = []
    for p in payments:
        results.append({
            "id": p.id,
            "payment_number": p.payment_number,
            "invoice_id": p.invoice_id,
            "invoice_number": p.invoice.invoice_number if p.invoice else None,
            "customer_id": p.customer_id,
            "customer_name": p.customer.company_name if p.customer else None,
            "payment_method": p.payment_method,
            "amount": p.amount,
            "payment_date": p.payment_date,
            "transaction_reference": p.transaction_reference,
            "notes": p.notes,
            "status": p.status,
            "created_at": p.created_at
        })
    return results

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    request: PaymentCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(Invoice.id == request.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="This invoice has already been fully paid.")

    if invoice.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot record payment against a cancelled invoice.")

    if request.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    if request.amount > invoice.outstanding_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (₹{request.amount}) exceeds the remaining outstanding balance of ₹{invoice.outstanding_amount}."
        )

    pay_num = generate_payment_number(db)
    pay_date = request.payment_date or date.today()

    new_payment = Payment(
        payment_number=pay_num,
        invoice_id=invoice.id,
        customer_id=invoice.customer_id,
        payment_method=request.payment_method,
        amount=request.amount,
        payment_date=pay_date,
        transaction_reference=request.transaction_reference,
        notes=request.notes,
        status="completed"
    )
    db.add(new_payment)

    # Update invoice balances
    invoice.paid_amount += request.amount
    invoice.outstanding_amount = max(Decimal("0.00"), invoice.total_amount - invoice.paid_amount)

    # Automatically mark invoice as Paid when balance reaches 0!
    if invoice.outstanding_amount <= Decimal("0.00"):
        invoice.status = "paid"

    log = ActivityLog(
        user_id=current_user.id,
        action="RECORD_PAYMENT",
        entity_type="payments",
        entity_id=None,
        details=f"Payment of ₹{request.amount} recorded for Invoice {invoice.invoice_number} ({pay_num}) by {current_user.email}."
    )
    db.add(log)
    db.commit()
    db.refresh(new_payment)

    return {
        "id": new_payment.id,
        "payment_number": new_payment.payment_number,
        "invoice_id": new_payment.invoice_id,
        "invoice_number": invoice.invoice_number,
        "customer_id": new_payment.customer_id,
        "customer_name": invoice.customer.company_name if invoice.customer else None,
        "payment_method": new_payment.payment_method,
        "amount": new_payment.amount,
        "payment_date": new_payment.payment_date,
        "transaction_reference": new_payment.transaction_reference,
        "notes": new_payment.notes,
        "status": new_payment.status,
        "created_at": new_payment.created_at
    }
