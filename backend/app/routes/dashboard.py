from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.connection import get_db
from backend.app.models.models import (
    Customer, Product, Plan, Subscription, Invoice, Payment, ActivityLog, User
)
from backend.app.schemas.schemas import DashboardStatsResponse
from backend.app.middleware.auth import require_staff_or_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_statistics(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    today = date.today()

    # Core metrics
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_plans = db.query(func.count(Plan.id)).scalar() or 0

    total_subscriptions = db.query(func.count(Subscription.id)).scalar() or 0
    active_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status == "active").scalar() or 0
    closed_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status == "closed").scalar() or 0
    paused_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status == "paused").scalar() or 0

    total_invoices = db.query(func.count(Invoice.id)).scalar() or 0
    paid_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "paid").scalar() or 0
    outstanding_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status.in_(["confirmed", "overdue"])).scalar() or 0
    overdue_invoices = db.query(func.count(Invoice.id)).filter(Invoice.due_date < today, Invoice.outstanding_amount > 0, Invoice.status != "cancelled").scalar() or 0

    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).filter(Payment.status == "completed").scalar() or Decimal("0.00")
    total_outstanding_amount = db.query(func.coalesce(func.sum(Invoice.outstanding_amount), Decimal("0.00"))).filter(Invoice.status.in_(["confirmed", "overdue"])).scalar() or Decimal("0.00")

    # Monthly revenue trend (last 6 months)
    monthly_rows = (
        db.query(
            func.date_format(Payment.payment_date, "%b %Y").label("month"),
            func.coalesce(func.sum(Payment.amount), Decimal("0.00")).label("amount")
        )
        .filter(Payment.status == "completed")
        .group_by(func.date_format(Payment.payment_date, "%b %Y"))
        .order_by(func.min(Payment.payment_date).asc())
        .limit(6)
        .all()
    )
    monthly_revenue = [{"month": r.month, "amount": float(r.amount)} for r in monthly_rows]
    if not monthly_revenue:
        monthly_revenue = [{"month": "Oct 2026", "amount": float(total_revenue)}]

    # Subscription growth trend
    sub_growth_rows = (
        db.query(
            func.date_format(Subscription.start_date, "%b %Y").label("month"),
            func.count(Subscription.id).label("count")
        )
        .group_by(func.date_format(Subscription.start_date, "%b %Y"))
        .order_by(func.min(Subscription.start_date).asc())
        .limit(6)
        .all()
    )
    subscription_growth = [{"month": r.month, "subscriptions": r.count} for r in sub_growth_rows]

    # Status distribution
    status_distribution = [
        {"name": "Active", "value": active_subscriptions, "color": "#16a34a"},
        {"name": "Paused", "value": paused_subscriptions, "color": "#f59e0b"},
        {"name": "Closed", "value": closed_subscriptions, "color": "#64748b"}
    ]

    # Recent transactions
    recent_pmts = (
        db.query(Payment)
        .join(Customer)
        .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
        .limit(5)
        .all()
    )
    recent_transactions = [
        {
            "id": p.id,
            "payment_number": p.payment_number,
            "customer_name": p.customer.company_name if p.customer else "Unknown",
            "amount": float(p.amount),
            "payment_method": p.payment_method,
            "date": str(p.payment_date),
            "status": p.status
        }
        for p in recent_pmts
    ]

    return {
        "total_customers": total_customers,
        "total_products": total_products,
        "total_plans": total_plans,
        "total_subscriptions": total_subscriptions,
        "active_subscriptions": active_subscriptions,
        "closed_subscriptions": closed_subscriptions,
        "paused_subscriptions": paused_subscriptions,
        "total_invoices": total_invoices,
        "paid_invoices": paid_invoices,
        "outstanding_invoices": outstanding_invoices,
        "overdue_invoices": overdue_invoices,
        "total_revenue": total_revenue,
        "total_outstanding_amount": total_outstanding_amount,
        "monthly_revenue": monthly_revenue,
        "subscription_growth": subscription_growth,
        "status_distribution": status_distribution,
        "recent_transactions": recent_transactions
    }
