from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.connection import get_db
from backend.app.models.models import (
    Quotation, QuotationLine, QuotationTemplate, Customer, Product, ProductVariantOption,
    Subscription, SubscriptionLine, Plan, User, ActivityLog
)
from backend.app.schemas.schemas import QuotationResponse, QuotationCreate, SubscriptionResponse
from backend.app.middleware.auth import require_staff_or_admin

router = APIRouter(prefix="/quotations", tags=["Quotations"])

def generate_quotation_number(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Quotation.id)).scalar() or 0
    return f"QTN-{year}-{count + 1:04d}"

def generate_subscription_number(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Subscription.id)).scalar() or 0
    return f"SUB-{year}-{count + 1:04d}"

@router.get("", response_model=List[QuotationResponse])
def list_quotations(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Quotation)
    if status:
        query = query.filter(Quotation.status == status)
    if customer_id:
        query = query.filter(Quotation.customer_id == customer_id)

    quotes = query.order_by(Quotation.created_at.desc()).all()
    results = []
    for q in quotes:
        lines = []
        for l in q.lines:
            lines.append({
                "id": l.id,
                "quotation_id": l.quotation_id,
                "product_id": l.product_id,
                "product_name": l.product.name if l.product else None,
                "variant_option_id": l.variant_option_id,
                "variant_option_name": l.variant_option.option_name if l.variant_option else None,
                "quantity": l.quantity,
                "unit_price": l.unit_price,
                "tax_rate": l.tax_rate,
                "tax_amount": l.tax_amount,
                "line_amount": l.line_amount,
                "created_at": l.created_at
            })
        results.append({
            "id": q.id,
            "quotation_number": q.quotation_number,
            "customer_id": q.customer_id,
            "customer_name": q.customer.company_name if q.customer else None,
            "template_id": q.template_id,
            "validity_date": q.validity_date,
            "status": q.status,
            "subtotal": q.subtotal,
            "tax_amount": q.tax_amount,
            "discount_amount": q.discount_amount,
            "total_amount": q.total_amount,
            "notes": q.notes,
            "created_at": q.created_at,
            "lines": lines
        })
    return results

@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    lines = []
    for l in q.lines:
        lines.append({
            "id": l.id,
            "quotation_id": l.quotation_id,
            "product_id": l.product_id,
            "product_name": l.product.name if l.product else None,
            "variant_option_id": l.variant_option_id,
            "variant_option_name": l.variant_option.option_name if l.variant_option else None,
            "quantity": l.quantity,
            "unit_price": l.unit_price,
            "tax_rate": l.tax_rate,
            "tax_amount": l.tax_amount,
            "line_amount": l.line_amount,
            "created_at": l.created_at
        })

    return {
        "id": q.id,
        "quotation_number": q.quotation_number,
        "customer_id": q.customer_id,
        "customer_name": q.customer.company_name if q.customer else None,
        "template_id": q.template_id,
        "validity_date": q.validity_date,
        "status": q.status,
        "subtotal": q.subtotal,
        "tax_amount": q.tax_amount,
        "discount_amount": q.discount_amount,
        "total_amount": q.total_amount,
        "notes": q.notes,
        "created_at": q.created_at,
        "lines": lines
    }

@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(
    request: QuotationCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    q_number = generate_quotation_number(db)
    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    lines_to_add = []

    for l in request.lines:
        prod = db.query(Product).filter(Product.id == l.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product ID {l.product_id} not found.")

        # Unit price
        unit_price = l.unit_price
        line_base = unit_price * Decimal(str(l.quantity))
        tax_amt = (line_base * l.tax_rate) / Decimal("100.00")
        line_total = line_base + tax_amt

        subtotal += line_base
        total_tax += tax_amt

        lines_to_add.append(QuotationLine(
            product_id=l.product_id,
            variant_option_id=l.variant_option_id,
            quantity=l.quantity,
            unit_price=unit_price,
            tax_rate=l.tax_rate,
            tax_amount=tax_amt,
            line_amount=line_total
        ))

    grand_total = subtotal + total_tax

    new_q = Quotation(
        quotation_number=q_number,
        customer_id=request.customer_id,
        template_id=request.template_id,
        validity_date=request.validity_date,
        status="quotation",
        subtotal=subtotal,
        tax_amount=total_tax,
        discount_amount=Decimal("0.00"),
        total_amount=grand_total,
        notes=request.notes,
        lines=lines_to_add
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)

    return get_quotation(new_q.id, current_user, db)

@router.post("/from-template/{template_id}", response_model=QuotationResponse)
def create_quotation_from_template(
    template_id: int,
    customer_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    tmpl = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Quotation template not found.")

    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    validity = date.today() + timedelta(days=tmpl.validity_days)
    q_number = generate_quotation_number(db)

    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    lines = []

    for tl in tmpl.lines:
        line_base = tl.default_price * Decimal(str(tl.default_quantity))
        # Standard tax 18%
        tax_amt = (line_base * Decimal("18.00")) / Decimal("100.00")
        line_total = line_base + tax_amt

        subtotal += line_base
        total_tax += tax_amt

        lines.append(QuotationLine(
            product_id=tl.product_id,
            quantity=tl.default_quantity,
            unit_price=tl.default_price,
            tax_rate=Decimal("18.00"),
            tax_amount=tax_amt,
            line_amount=line_total
        ))

    grand_total = subtotal + total_tax

    new_q = Quotation(
        quotation_number=q_number,
        customer_id=customer_id,
        template_id=template_id,
        validity_date=validity,
        status="quotation",
        subtotal=subtotal,
        tax_amount=total_tax,
        discount_amount=Decimal("0.00"),
        total_amount=grand_total,
        notes=f"Generated automatically from template: {tmpl.template_name}",
        lines=lines
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)

    return get_quotation(new_q.id, current_user, db)

@router.patch("/{quotation_id}/status")
def update_quotation_status(
    quotation_id: int,
    status: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if status not in ["draft", "quotation", "confirmed", "active", "closed"]:
        raise HTTPException(status_code=400, detail="Invalid status value.")

    q.status = status
    db.commit()
    return {"message": f"Quotation status updated to {status}."}

@router.post("/{quotation_id}/convert-to-subscription")
def convert_quotation_to_subscription(
    quotation_id: int,
    plan_id: Optional[int] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    # Find or use specified plan
    selected_plan_id = plan_id
    if not selected_plan_id:
        # Check first line product's active plan
        if q.lines:
            first_prod_id = q.lines[0].product_id
            plan = db.query(Plan).filter(Plan.product_id == first_prod_id, Plan.status == "active").first()
            if plan:
                selected_plan_id = plan.id

    if not selected_plan_id:
        # Fallback to any active plan
        plan = db.query(Plan).filter(Plan.status == "active").first()
        if plan:
            selected_plan_id = plan.id
        else:
            raise HTTPException(status_code=400, detail="No active plan available to attach to subscription.")

    plan_obj = db.query(Plan).filter(Plan.id == selected_plan_id).first()
    sub_num = generate_subscription_number(db)

    start_d = date.today()
    expiry_d = start_d + timedelta(days=365) # 1 year by default
    next_billing = start_d + timedelta(days=30)

    sub_lines = []
    for ql in q.lines:
        sub_lines.append(SubscriptionLine(
            product_id=ql.product_id,
            variant_option_id=ql.variant_option_id,
            quantity=ql.quantity,
            unit_price=ql.unit_price,
            tax_rate=ql.tax_rate,
            tax_amount=ql.tax_amount,
            discount_amount=Decimal("0.00"),
            line_amount=ql.line_amount
        ))

    sub = Subscription(
        subscription_number=sub_num,
        customer_id=q.customer_id,
        plan_id=selected_plan_id,
        quotation_id=q.id,
        start_date=start_d,
        expiry_date=expiry_d,
        next_billing_date=next_billing,
        payment_terms="Net 30",
        status="active",
        auto_close=plan_obj.auto_close if plan_obj else False,
        early_closure_allowed=plan_obj.early_closure_allowed if plan_obj else True,
        pause_allowed=plan_obj.pause_allowed if plan_obj else True,
        renewal_allowed=plan_obj.renewal_allowed if plan_obj else True,
        subtotal=q.subtotal,
        tax_amount=q.tax_amount,
        discount_amount=q.discount_amount,
        total_amount=q.total_amount,
        notes=f"Converted from Quotation {q.quotation_number}",
        lines=sub_lines
    )
    db.add(sub)
    q.status = "confirmed"

    log = ActivityLog(
        user_id=current_user.id,
        action="CONVERT_QUOTATION_TO_SUBSCRIPTION",
        entity_type="subscriptions",
        entity_id=None,
        details=f"Quotation {q.quotation_number} converted to Subscription {sub_num} by {current_user.email}."
    )
    db.add(log)
    db.commit()
    db.refresh(sub)

    return {
        "message": f"Successfully created subscription {sub_num} from quotation.",
        "subscription_id": sub.id,
        "subscription_number": sub.subscription_number
    }
