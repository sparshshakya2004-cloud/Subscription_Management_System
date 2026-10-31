from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.app.database.connection import get_db
from backend.app.models.models import (
    Subscription, SubscriptionLine, Customer, Plan, Product, ProductVariantOption,
    ActivityLog, User
)
from backend.app.schemas.schemas import (
    SubscriptionResponse, SubscriptionCreate, SubscriptionUpdate, SubscriptionLifecycleAction
)
from backend.app.middleware.auth import require_staff_or_admin, get_current_user

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

def generate_subscription_number(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Subscription.id)).scalar() or 0
    return f"SUB-{year}-{count + 1:04d}"

@router.get("", response_model=List[SubscriptionResponse])
def list_subscriptions(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Subscription).join(Customer).join(Plan)

    # Customer isolation
    if current_user.role.name == "Customer":
        if not current_user.customer:
            return []
        query = query.filter(Subscription.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Subscription.customer_id == customer_id)

    if status:
        query = query.filter(Subscription.status == status)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Subscription.subscription_number.ilike(term),
                Customer.company_name.ilike(term),
                Plan.plan_name.ilike(term)
            )
        )

    subs = query.order_by(Subscription.created_at.desc()).all()
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
            "customer_name": s.customer.company_name if s.customer else None,
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

@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    s = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    # Customer isolation
    if current_user.role.name == "Customer":
        if not current_user.customer or s.customer_id != current_user.customer.id:
            raise HTTPException(status_code=403, detail="Access denied to this subscription.")

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

    return {
        "id": s.id,
        "subscription_number": s.subscription_number,
        "customer_id": s.customer_id,
        "customer_name": s.customer.company_name if s.customer else None,
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
    }

@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    request: SubscriptionCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    sub_number = generate_subscription_number(db)
    next_billing = request.next_billing_date or (request.start_date + timedelta(days=30))

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

        lines_to_add.append(SubscriptionLine(
            product_id=l.product_id,
            variant_option_id=l.variant_option_id,
            quantity=l.quantity,
            unit_price=l.unit_price,
            tax_rate=l.tax_rate,
            tax_amount=tax_amt,
            discount_amount=disc_amt,
            line_amount=line_tot
        ))

    grand_total = subtotal + total_tax - total_discount

    new_sub = Subscription(
        subscription_number=sub_number,
        customer_id=request.customer_id,
        plan_id=request.plan_id,
        quotation_id=request.quotation_id,
        start_date=request.start_date,
        expiry_date=request.expiry_date,
        next_billing_date=next_billing,
        payment_terms=request.payment_terms,
        status="active",
        auto_close=request.auto_close or plan.auto_close,
        early_closure_allowed=plan.early_closure_allowed,
        pause_allowed=plan.pause_allowed,
        renewal_allowed=plan.renewal_allowed,
        subtotal=subtotal,
        tax_amount=total_tax,
        discount_amount=total_discount,
        total_amount=grand_total,
        notes=request.notes,
        lines=lines_to_add
    )
    db.add(new_sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="CREATE_SUBSCRIPTION",
        entity_type="subscriptions",
        entity_id=None,
        details=f"Subscription {sub_number} created for customer {customer.company_name}."
    )
    db.add(log)
    db.commit()
    db.refresh(new_sub)

    return get_subscription(new_sub.id, current_user, db)

@router.post("/{sub_id}/action")
def execute_subscription_lifecycle_action(
    sub_id: int,
    action_req: SubscriptionLifecycleAction,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    action = action_req.action.lower()

    if action == "pause":
        if not sub.pause_allowed:
            raise HTTPException(status_code=400, detail="This plan does not permit pausing subscriptions.")
        if sub.status != "active":
            raise HTTPException(status_code=400, detail="Only active subscriptions can be paused.")
        sub.status = "paused"
        sub.pause_reason = action_req.reason or "Paused by staff"

    elif action == "resume":
        if sub.status != "paused":
            raise HTTPException(status_code=400, detail="Only paused subscriptions can be resumed.")
        sub.status = "active"
        sub.pause_reason = None

    elif action == "close":
        if not sub.early_closure_allowed and sub.expiry_date and sub.expiry_date > date.today():
            raise HTTPException(status_code=400, detail="This plan does not permit early closure before expiration.")
        sub.status = "closed"

    elif action == "renew":
        if not sub.renewal_allowed:
            raise HTTPException(status_code=400, detail="This plan does not permit renewals.")
        # Renew: extend expiry date by 1 year or specified date
        if action_req.renew_until:
            sub.expiry_date = action_req.renew_until
        else:
            base_date = sub.expiry_date if (sub.expiry_date and sub.expiry_date > date.today()) else date.today()
            sub.expiry_date = base_date + timedelta(days=365)
        sub.status = "active"

    else:
        raise HTTPException(status_code=400, detail="Unknown lifecycle action. Valid: pause, resume, close, renew.")

    log = ActivityLog(
        user_id=current_user.id,
        action=f"SUBSCRIPTION_{action.upper()}",
        entity_type="subscriptions",
        entity_id=sub.id,
        details=f"Subscription {sub.subscription_number} action '{action}' performed by {current_user.email}."
    )
    db.add(log)
    db.commit()
    db.refresh(sub)

    return {
        "message": f"Subscription {sub.subscription_number} {action} action completed successfully.",
        "status": sub.status,
        "expiry_date": str(sub.expiry_date) if sub.expiry_date else None
    }
