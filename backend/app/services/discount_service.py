from decimal import Decimal
from datetime import date
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import Discount, DiscountUsage, DiscountProduct

def evaluate_discount(
    db: Session,
    discount: Discount,
    subtotal: Decimal,
    total_quantity: int,
    product_ids: List[int],
    current_date: Optional[date] = None
) -> Tuple[bool, Decimal, str]:
    """
    Evaluates discount eligibility based on:
    - Active status
    - Date range (start_date <= current_date <= end_date)
    - Max usage limit
    - Min purchase amount
    - Min quantity
    - Product applicability (if product-specific)
    Returns: (is_eligible, calculated_discount_amount, reason)
    """
    if current_date is None:
        current_date = date.today()

    if not discount.is_active:
        return False, Decimal("0.00"), "Discount is inactive."

    if current_date < discount.start_date:
        return False, Decimal("0.00"), f"Discount not active until {discount.start_date}."

    if current_date > discount.end_date:
        return False, Decimal("0.00"), f"Discount expired on {discount.end_date}."

    if discount.current_usage_count >= discount.max_usage_limit:
        return False, Decimal("0.00"), "Discount has reached maximum usage limit."

    if subtotal < discount.min_purchase_amount:
        return False, Decimal("0.00"), f"Order subtotal {subtotal} below minimum required {discount.min_purchase_amount}."

    if total_quantity < discount.min_quantity:
        return False, Decimal("0.00"), f"Order quantity {total_quantity} below minimum required {discount.min_quantity}."

    # Check product restrictions if any
    restricted_products = db.query(DiscountProduct.product_id).filter(DiscountProduct.discount_id == discount.id).all()
    if restricted_products:
        applicable_pids = {p[0] for p in restricted_products}
        if not any(pid in applicable_pids for pid in product_ids):
            return False, Decimal("0.00"), "None of the ordered products are eligible for this discount."

    # Calculate discount value
    if discount.discount_type == "percentage":
        amount = (subtotal * discount.discount_value) / Decimal("100.00")
    else:
        # Fixed amount discount
        amount = min(discount.discount_value, subtotal)

    amount = round(amount, 2)
    return True, amount, "Discount applied successfully."

def record_discount_usage(
    db: Session,
    discount_id: int,
    customer_id: int,
    invoice_id: Optional[int],
    amount_applied: Decimal
) -> None:
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if discount:
        discount.current_usage_count += 1
        usage = DiscountUsage(
            discount_id=discount_id,
            customer_id=customer_id,
            invoice_id=invoice_id,
            amount_applied=amount_applied
        )
        db.add(usage)
