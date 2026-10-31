import csv
import io
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from backend.app.models.models import (
    Subscription, Invoice, Payment, Customer, Plan, Product
)

def get_finance_dashboard_summary(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
    today = date.today()

    # 1. How many subscriptions are active?
    active_subscriptions_count = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.status == "active")
        .scalar() or 0
    )

    # 2. How much revenue has been received?
    total_revenue_received = (
        db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .filter(Payment.status == "completed")
        .scalar() or Decimal("0.00")
    )

    # 3. How much money is still outstanding?
    total_outstanding_amount = (
        db.query(func.coalesce(func.sum(Invoice.outstanding_amount), Decimal("0.00")))
        .filter(Invoice.status.in_(["confirmed", "overdue"]))
        .scalar() or Decimal("0.00")
    )

    # 4. Which invoices are overdue?
    # Ensure any invoice past due date with outstanding > 0 is treated as overdue
    overdue_invoices_query = (
        db.query(Invoice)
        .join(Customer, Invoice.customer_id == Customer.id)
        .filter(Invoice.due_date < today)
        .filter(Invoice.outstanding_amount > 0)
        .filter(Invoice.status != "cancelled")
    )

    overdue_invoices_count = overdue_invoices_query.count()
    overdue_invoices_list = []
    for inv in overdue_invoices_query.order_by(Invoice.due_date.asc()).all():
        overdue_invoices_list.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_id": inv.customer_id,
            "customer_name": inv.customer.company_name if inv.customer else "Unknown",
            "invoice_date": str(inv.invoice_date),
            "due_date": str(inv.due_date),
            "total_amount": float(inv.total_amount),
            "paid_amount": float(inv.paid_amount),
            "outstanding_amount": float(inv.outstanding_amount),
            "days_overdue": (today - inv.due_date).days,
            "status": inv.status
        })

    # 5. How much revenue was generated monthly? (From payments or invoices)
    # Using payments for actual cash collections per month
    month_col = func.date_format(Payment.payment_date, "%Y-%m")
    monthly_rows = (
        db.query(
            month_col.label("month"),
            func.coalesce(func.sum(Payment.amount), Decimal("0.00")).label("revenue"),
            func.count(Payment.id).label("payment_count")
        )
        .filter(Payment.status == "completed")
        .group_by(month_col)
        .order_by(month_col.asc())
        .all()
    )

    monthly_revenue_breakdown = [
        {"month": row.month, "revenue": float(row.revenue), "count": row.payment_count}
        for row in monthly_rows
    ]

    # 6. Which subscriptions are due for renewal?
    # Subscriptions where expiry_date is between today and next 30 days
    thirty_days_later = today + timedelta(days=30)
    renewals_query = (
        db.query(Subscription)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.status == "active")
        .filter(Subscription.expiry_date != None)
        .filter(Subscription.expiry_date >= today)
        .filter(Subscription.expiry_date <= thirty_days_later)
        .order_by(Subscription.expiry_date.asc())
    )

    subscriptions_due_for_renewal = []
    for sub in renewals_query.all():
        subscriptions_due_for_renewal.append({
            "id": sub.id,
            "subscription_number": sub.subscription_number,
            "customer_id": sub.customer_id,
            "customer_name": sub.customer.company_name if sub.customer else "Unknown",
            "plan_name": sub.plan.plan_name if sub.plan else "Unknown",
            "expiry_date": str(sub.expiry_date),
            "renewal_allowed": sub.renewal_allowed,
            "total_amount": float(sub.total_amount),
            "days_until_expiry": (sub.expiry_date - today).days
        })

    return {
        "active_subscriptions_count": active_subscriptions_count,
        "total_revenue_received": float(total_revenue_received),
        "total_outstanding_amount": float(total_outstanding_amount),
        "overdue_invoices_count": overdue_invoices_count,
        "monthly_revenue_breakdown": monthly_revenue_breakdown,
        "subscriptions_due_for_renewal": subscriptions_due_for_renewal,
        "overdue_invoices_list": overdue_invoices_list
    }

def generate_csv_export(db: Session, report_type: str) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "invoices":
        writer.writerow(["Invoice Number", "Customer", "Invoice Date", "Due Date", "Total Amount", "Paid Amount", "Outstanding Amount", "Status"])
        invoices = db.query(Invoice).join(Customer).order_by(Invoice.invoice_date.desc()).all()
        for inv in invoices:
            writer.writerow([
                inv.invoice_number,
                inv.customer.company_name if inv.customer else "",
                inv.invoice_date,
                inv.due_date,
                float(inv.total_amount),
                float(inv.paid_amount),
                float(inv.outstanding_amount),
                inv.status
            ])

    elif report_type == "subscriptions":
        writer.writerow(["Subscription Number", "Customer", "Plan", "Start Date", "Expiry Date", "Next Billing Date", "Payment Terms", "Status", "Total Amount"])
        subs = db.query(Subscription).join(Customer).join(Plan).order_by(Subscription.created_at.desc()).all()
        for s in subs:
            writer.writerow([
                s.subscription_number,
                s.customer.company_name if s.customer else "",
                s.plan.plan_name if s.plan else "",
                s.start_date,
                s.expiry_date or "N/A",
                s.next_billing_date,
                s.payment_terms,
                s.status,
                float(s.total_amount)
            ])

    elif report_type == "payments":
        writer.writerow(["Payment Number", "Invoice", "Customer", "Payment Method", "Amount", "Payment Date", "Transaction Reference", "Status"])
        payments = db.query(Payment).join(Invoice).join(Customer).order_by(Payment.payment_date.desc()).all()
        for p in payments:
            writer.writerow([
                p.payment_number,
                p.invoice.invoice_number if p.invoice else "",
                p.customer.company_name if p.customer else "",
                p.payment_method,
                float(p.amount),
                p.payment_date,
                p.transaction_reference or "",
                p.status
            ])

    return output.getvalue()
