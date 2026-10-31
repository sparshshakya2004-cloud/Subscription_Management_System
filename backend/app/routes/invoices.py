from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.app.database.connection import get_db
from backend.app.models.models import Invoice, InvoiceLine, Customer, Subscription, Product, ActivityLog, User
from backend.app.schemas.schemas import InvoiceResponse, InvoiceCreate
from backend.app.middleware.auth import require_staff_or_admin, get_current_user
from backend.app.services.billing_service import run_recurring_billing, generate_invoice_number
from backend.app.utils.pdf_generator import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["Invoices & Billing"])

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Invoice).join(Customer)

    # Customer role data isolation
    if current_user.role.name == "Customer":
        if not current_user.customer:
            return []
        query = query.filter(Invoice.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    if status:
        query = query.filter(Invoice.status == status)

    if is_overdue:
        query = query.filter(Invoice.due_date < date.today(), Invoice.outstanding_amount > 0, Invoice.status != "cancelled")

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(term),
                Customer.company_name.ilike(term)
            )
        )

    invoices = query.order_by(Invoice.invoice_date.desc()).all()
    results = []
    for inv in invoices:
        lines = []
        for l in inv.lines:
            lines.append({
                "id": l.id,
                "invoice_id": l.invoice_id,
                "product_id": l.product_id,
                "product_name": l.product.name if l.product else None,
                "description": l.description,
                "quantity": l.quantity,
                "unit_price": l.unit_price,
                "tax_rate": l.tax_rate,
                "tax_amount": l.tax_amount,
                "discount_amount": l.discount_amount,
                "line_total": l.line_total,
                "created_at": l.created_at
            })
        results.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_id": inv.customer_id,
            "customer_name": inv.customer.company_name if inv.customer else None,
            "customer_email": inv.customer.email if inv.customer else None,
            "customer_phone": inv.customer.phone if inv.customer else None,
            "customer_address": inv.customer.billing_address if inv.customer else None,
            "subscription_id": inv.subscription_id,
            "subscription_number": inv.subscription.subscription_number if inv.subscription else None,
            "invoice_date": inv.invoice_date,
            "due_date": inv.due_date,
            "subtotal": inv.subtotal,
            "tax_amount": inv.tax_amount,
            "discount_amount": inv.discount_amount,
            "total_amount": inv.total_amount,
            "paid_amount": inv.paid_amount,
            "outstanding_amount": inv.outstanding_amount,
            "status": inv.status,
            "notes": inv.notes,
            "created_at": inv.created_at,
            "lines": lines
        })
    return results

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if current_user.role.name == "Customer":
        if not current_user.customer or inv.customer_id != current_user.customer.id:
            raise HTTPException(status_code=403, detail="Access denied to this invoice.")

    lines = []
    for l in inv.lines:
        lines.append({
            "id": l.id,
            "invoice_id": l.invoice_id,
            "product_id": l.product_id,
            "product_name": l.product.name if l.product else None,
            "description": l.description,
            "quantity": l.quantity,
            "unit_price": l.unit_price,
            "tax_rate": l.tax_rate,
            "tax_amount": l.tax_amount,
            "discount_amount": l.discount_amount,
            "line_total": l.line_total,
            "created_at": l.created_at
        })

    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "customer_id": inv.customer_id,
        "customer_name": inv.customer.company_name if inv.customer else None,
        "customer_email": inv.customer.email if inv.customer else None,
        "customer_phone": inv.customer.phone if inv.customer else None,
        "customer_address": inv.customer.billing_address if inv.customer else None,
        "subscription_id": inv.subscription_id,
        "subscription_number": inv.subscription.subscription_number if inv.subscription else None,
        "invoice_date": inv.invoice_date,
        "due_date": inv.due_date,
        "subtotal": inv.subtotal,
        "tax_amount": inv.tax_amount,
        "discount_amount": inv.discount_amount,
        "total_amount": inv.total_amount,
        "paid_amount": inv.paid_amount,
        "outstanding_amount": inv.outstanding_amount,
        "status": inv.status,
        "notes": inv.notes,
        "created_at": inv.created_at,
        "lines": lines
    }

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice_manual(
    request: InvoiceCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    cust = db.query(Customer).filter(Customer.id == request.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    inv_num = generate_invoice_number(db)
    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_discount = Decimal("0.00")
    lines_to_add = []

    for l in request.lines:
        line_sub = l.unit_price * Decimal(str(l.quantity))
        tax_amt = (line_sub * l.tax_rate) / Decimal("100.00")
        disc_amt = l.discount_amount
        line_tot = line_sub + tax_amt - disc_amt

        subtotal += line_sub
        total_tax += tax_amt
        total_discount += disc_amt

        lines_to_add.append(InvoiceLine(
            product_id=l.product_id,
            description=l.description,
            quantity=l.quantity,
            unit_price=l.unit_price,
            tax_rate=l.tax_rate,
            tax_amount=tax_amt,
            discount_amount=disc_amt,
            line_total=line_tot
        ))

    grand_total = subtotal + total_tax - total_discount

    inv = Invoice(
        invoice_number=inv_num,
        customer_id=request.customer_id,
        subscription_id=request.subscription_id,
        invoice_date=request.invoice_date,
        due_date=request.due_date,
        subtotal=subtotal,
        tax_amount=total_tax,
        discount_amount=total_discount,
        total_amount=grand_total,
        paid_amount=Decimal("0.00"),
        outstanding_amount=grand_total,
        status="draft",
        notes=request.notes,
        lines=lines_to_add
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    return get_invoice(inv.id, current_user, db)

@router.patch("/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    status: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if status not in ["draft", "confirmed", "paid", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status.")

    inv.status = status
    if status == "paid":
        inv.paid_amount = inv.total_amount
        inv.outstanding_amount = Decimal("0.00")
    elif status == "cancelled":
        inv.outstanding_amount = Decimal("0.00")

    db.commit()
    return {"message": f"Invoice {inv.invoice_number} status updated to {status}."}

@router.post("/run-billing-cycle")
def trigger_recurring_billing_cycle(
    target_date: Optional[date] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Executes automated recurring billing cycle across all active subscriptions.
    """
    stats = run_recurring_billing(db, target_date=target_date)
    return {
        "message": f"Recurring billing run finished: {stats['invoices_generated_count']} invoices created, {stats['skipped_duplicate_count']} duplicates skipped, {stats['auto_closed_count']} expired auto-closed.",
        "details": stats
    }

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv_data = get_invoice(invoice_id, current_user, db)
    pdf_bytes = generate_invoice_pdf(inv_data)

    filename = f"{inv_data['invoice_number']}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
