from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.connection import get_db
from backend.app.models.models import Customer, Subscription, Invoice, Payment, Plan, User
from backend.app.schemas.schemas import (
    CustomerResponse, CustomerUpdate, SubscriptionResponse,
    InvoiceResponse, PaymentResponse, PlanResponse
)
from backend.app.middleware.auth import require_customer, get_customer_for_user
from backend.app.utils.pdf_generator import generate_invoice_pdf

router = APIRouter(prefix="/portal", tags=["Customer Portal"])

@router.get("/profile", response_model=CustomerResponse)
def get_customer_profile(
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    return customer

@router.put("/profile", response_model=CustomerResponse)
def update_customer_profile(
    request: CustomerUpdate,
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    # Customer can update contact info, address, phone, but not code or status
    if request.contact_name:
        customer.contact_name = request.contact_name
    if request.phone:
        customer.phone = request.phone
    if request.billing_address:
        customer.billing_address = request.billing_address
    if request.tax_number:
        customer.tax_number = request.tax_number
    if request.company_name:
        customer.company_name = request.company_name

    db.commit()
    db.refresh(customer)
    return customer

@router.get("/overview")
def get_customer_overview(
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    active_subs_count = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.customer_id == customer.id, Subscription.status == "active")
        .scalar() or 0
    )

    total_invoices_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.customer_id == customer.id)
        .scalar() or 0
    )

    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.outstanding_amount), Decimal("0.00")))
        .filter(Invoice.customer_id == customer.id, Invoice.status.in_(["confirmed", "overdue"]))
        .scalar() or Decimal("0.00")
    )

    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .filter(Payment.customer_id == customer.id, Payment.status == "completed")
        .scalar() or Decimal("0.00")
    )

    return {
        "customer_id": customer.id,
        "customer_code": customer.customer_code,
        "company_name": customer.company_name,
        "contact_name": customer.contact_name,
        "email": customer.email,
        "active_subscriptions_count": active_subs_count,
        "total_invoices_count": total_invoices_count,
        "total_outstanding_amount": float(total_outstanding),
        "total_paid_amount": float(total_paid)
    }

@router.get("/subscriptions", response_model=List[SubscriptionResponse])
def get_customer_subscriptions(
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    subs = (
        db.query(Subscription)
        .filter(Subscription.customer_id == customer.id)
        .order_by(Subscription.created_at.desc())
        .all()
    )
    results = []
    for s in subs:
        lines = []
        for l in s.lines:
            lines.append({
                "id": l.id,
                "subscription_id": l.subscription_id,
                "product_id": l.product_id,
                "product_name": l.product.name if l.product else None,
                "variant_option_id": l.variant_option_id,
                "variant_option_name": l.variant_option.option_name if l.variant_option else None,
                "quantity": l.quantity,
                "unit_price": l.unit_price,
                "tax_rate": l.tax_rate,
                "tax_amount": l.tax_amount,
                "discount_amount": l.discount_amount,
                "line_amount": l.line_amount,
                "created_at": l.created_at
            })
        results.append({
            "id": s.id,
            "subscription_number": s.subscription_number,
            "customer_id": s.customer_id,
            "customer_name": customer.company_name,
            "plan_id": s.plan_id,
            "plan_name": s.plan.plan_name if s.plan else None,
            "quotation_id": s.quotation_id,
            "start_date": s.start_date,
            "expiry_date": s.expiry_date,
            "next_billing_date": s.next_billing_date,
            "payment_terms": s.payment_terms,
            "status": s.status,
            "auto_close": s.auto_close,
            "early_closure_allowed": s.early_closure_allowed,
            "pause_allowed": s.pause_allowed,
            "renewal_allowed": s.renewal_allowed,
            "pause_reason": s.pause_reason,
            "subtotal": s.subtotal,
            "tax_amount": s.tax_amount,
            "discount_amount": s.discount_amount,
            "total_amount": s.total_amount,
            "notes": s.notes,
            "created_at": s.created_at,
            "lines": lines
        })
    return results

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_customer_invoices(
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    invoices = (
        db.query(Invoice)
        .filter(Invoice.customer_id == customer.id)
        .order_by(Invoice.invoice_date.desc())
        .all()
    )
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
            "customer_name": customer.company_name,
            "customer_email": customer.email,
            "customer_phone": customer.phone,
            "customer_address": customer.billing_address,
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

@router.get("/invoices/{invoice_id}/pdf")
def download_customer_invoice_pdf(
    invoice_id: int,
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.customer_id == customer.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied.")

    lines = []
    for l in inv.lines:
        lines.append({
            "description": l.description,
            "quantity": l.quantity,
            "unit_price": float(l.unit_price),
            "tax_rate": float(l.tax_rate),
            "line_total": float(l.line_total)
        })

    inv_data = {
        "invoice_number": inv.invoice_number,
        "customer_name": customer.company_name,
        "customer_email": customer.email,
        "customer_address": customer.billing_address,
        "invoice_date": str(inv.invoice_date),
        "due_date": str(inv.due_date),
        "status": inv.status,
        "subtotal": float(inv.subtotal),
        "tax_amount": float(inv.tax_amount),
        "discount_amount": float(inv.discount_amount),
        "total_amount": float(inv.total_amount),
        "paid_amount": float(inv.paid_amount),
        "outstanding_amount": float(inv.outstanding_amount),
        "lines": lines
    }

    pdf_bytes = generate_invoice_pdf(inv_data)
    filename = f"{inv.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/payments", response_model=List[PaymentResponse])
def get_customer_payments(
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    payments = (
        db.query(Payment)
        .filter(Payment.customer_id == customer.id)
        .order_by(Payment.payment_date.desc())
        .all()
    )
    results = []
    for p in payments:
        results.append({
            "id": p.id,
            "payment_number": p.payment_number,
            "invoice_id": p.invoice_id,
            "invoice_number": p.invoice.invoice_number if p.invoice else None,
            "customer_id": p.customer_id,
            "customer_name": customer.company_name,
            "payment_method": p.payment_method,
            "amount": p.amount,
            "payment_date": p.payment_date,
            "transaction_reference": p.transaction_reference,
            "notes": p.notes,
            "status": p.status,
            "created_at": p.created_at
        })
    return results

@router.get("/plans", response_model=List[PlanResponse])
def get_available_plans_for_customer(
    customer: Customer = Depends(get_customer_for_user),
    db: Session = Depends(get_db)
):
    plans = db.query(Plan).filter(Plan.status == "active").all()
    results = []
    for p in plans:
        results.append({
            "id": p.id,
            "plan_code": p.plan_code,
            "plan_name": p.plan_name,
            "product_id": p.product_id,
            "product_name": p.product.name if p.product else None,
            "plan_price": p.plan_price,
            "billing_frequency": p.billing_frequency,
            "minimum_quantity": p.minimum_quantity,
            "start_availability_date": p.start_availability_date,
            "end_availability_date": p.end_availability_date,
            "auto_close": p.auto_close,
            "early_closure_allowed": p.early_closure_allowed,
            "pause_allowed": p.pause_allowed,
            "renewal_allowed": p.renewal_allowed,
            "status": p.status,
            "created_at": p.created_at,
            "updated_at": p.updated_at
        })
    return results
