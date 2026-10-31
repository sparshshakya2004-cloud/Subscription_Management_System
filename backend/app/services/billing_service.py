import random
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.models import (
    Subscription, Invoice, InvoiceLine, BillingHistory, ActivityLog, Customer, Plan
)

def compute_due_date(invoice_date: date, payment_terms: str) -> date:
    terms = (payment_terms or "Net 30").lower()
    if "immediate" in terms or "due on receipt" in terms:
        return invoice_date
    elif "15" in terms:
        return invoice_date + timedelta(days=15)
    elif "60" in terms:
        return invoice_date + timedelta(days=60)
    else:
        # Default Net 30
        return invoice_date + timedelta(days=30)

def compute_next_dates(start: date, frequency: str) -> tuple[date, date]:
    freq = (frequency or "monthly").lower()
    if freq == "daily":
        period_end = start
        next_billing = start + timedelta(days=1)
    elif freq == "weekly":
        period_end = start + timedelta(days=6)
        next_billing = start + timedelta(days=7)
    elif freq == "yearly":
        period_end = start + relativedelta(years=1) - timedelta(days=1)
        next_billing = start + relativedelta(years=1)
    else:
        # monthly
        period_end = start + relativedelta(months=1) - timedelta(days=1)
        next_billing = start + relativedelta(months=1)
    return period_end, next_billing

def generate_invoice_number(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Invoice.id)).scalar() or 0
    return f"INV-{year}-{count + 1:04d}"

def run_recurring_billing(db: Session, target_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Idempotent recurring billing engine:
    1. Finds active subscriptions due on or before target_date.
    2. Auto-closes subscriptions if configured and expired.
    3. Prevents duplicate invoices for the same subscription & billing date.
    4. Computes lines, taxes, discounts, totals.
    5. Advances next_billing_date and logs to billing_history.
    """
    if target_date is None:
        target_date = date.today()

    due_subscriptions = (
        db.query(Subscription)
        .filter(Subscription.status == "active")
        .filter(Subscription.next_billing_date <= target_date)
        .all()
    )

    generated_invoices = []
    skipped_count = 0
    auto_closed_count = 0

    for sub in due_subscriptions:
        # 1. Check auto-closure if expiry_date has passed
        if sub.expiry_date and sub.expiry_date <= target_date and sub.auto_close:
            sub.status = "closed"
            auto_closed_count += 1
            log = ActivityLog(
                user_id=None,
                action="AUTO_CLOSE_SUBSCRIPTION",
                entity_type="subscriptions",
                entity_id=sub.id,
                details=f"Subscription {sub.subscription_number} automatically closed upon reaching expiry date {sub.expiry_date}."
            )
            db.add(log)
            continue

        # 2. Idempotency check: has an invoice already been issued for this subscription on this billing date?
        existing_invoice = (
            db.query(Invoice)
            .filter(Invoice.subscription_id == sub.id)
            .filter(Invoice.invoice_date == sub.next_billing_date)
            .first()
        )
        if existing_invoice:
            skipped_count += 1
            continue

        period_start = sub.next_billing_date
        period_end, next_billing = compute_next_dates(period_start, sub.plan.billing_frequency if sub.plan else "monthly")
        due_date = compute_due_date(period_start, sub.payment_terms)

        inv_number = generate_invoice_number(db)

        # Build invoice lines from subscription lines
        invoice_lines_data = []
        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_discount = Decimal("0.00")

        for sline in sub.lines:
            qty = sline.quantity
            unit_price = sline.unit_price
            line_subtotal = Decimal(str(qty)) * unit_price
            tax_amount = (line_subtotal * sline.tax_rate) / Decimal("100.00")
            disc_amount = sline.discount_amount
            line_total = line_subtotal + tax_amount - disc_amount

            subtotal += line_subtotal
            total_tax += tax_amount
            total_discount += disc_amount

            desc = f"{sline.product.name}" if sline.product else "Subscription Line"
            if sline.variant_option:
                desc += f" - {sline.variant_option.option_name}"

            inv_line = InvoiceLine(
                product_id=sline.product_id,
                description=desc,
                quantity=qty,
                unit_price=unit_price,
                tax_rate=sline.tax_rate,
                tax_amount=tax_amount,
                discount_amount=disc_amount,
                line_total=line_total
            )
            invoice_lines_data.append(inv_line)

        grand_total = subtotal + total_tax - total_discount

        new_invoice = Invoice(
            invoice_number=inv_number,
            customer_id=sub.customer_id,
            subscription_id=sub.id,
            invoice_date=period_start,
            due_date=due_date,
            subtotal=subtotal,
            tax_amount=total_tax,
            discount_amount=total_discount,
            total_amount=grand_total,
            paid_amount=Decimal("0.00"),
            outstanding_amount=grand_total,
            status="confirmed",
            notes=f"Recurring invoice for period {period_start} to {period_end}",
            lines=invoice_lines_data
        )
        db.add(new_invoice)
        db.flush() # Flush to get new_invoice.id

        # Update subscription next billing date
        sub.next_billing_date = next_billing

        # Record billing history
        history_entry = BillingHistory(
            subscription_id=sub.id,
            invoice_id=new_invoice.id,
            billing_date=period_start,
            period_start=period_start,
            period_end=period_end,
            amount=grand_total,
            status="success",
            notes=f"Auto-generated invoice {inv_number}"
        )
        db.add(history_entry)

        generated_invoices.append({
            "invoice_id": new_invoice.id,
            "invoice_number": inv_number,
            "customer_id": sub.customer_id,
            "subscription_number": sub.subscription_number,
            "total_amount": float(grand_total),
            "period": f"{period_start} to {period_end}",
            "next_billing_date": str(next_billing)
        })

    db.commit()

    return {
        "target_date": str(target_date),
        "total_due_found": len(due_subscriptions),
        "invoices_generated_count": len(generated_invoices),
        "skipped_duplicate_count": skipped_count,
        "auto_closed_count": auto_closed_count,
        "invoices": generated_invoices
    }
