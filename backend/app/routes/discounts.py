from typing import List, Optional
from decimal import Decimal
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.models import Discount, DiscountProduct, User
from backend.app.schemas.schemas import DiscountResponse, DiscountCreate, DiscountUpdate
from backend.app.middleware.auth import require_admin, get_current_user
from backend.app.services.discount_service import evaluate_discount

router = APIRouter(prefix="/discounts", tags=["Discount Management"])

@router.get("", response_model=List[DiscountResponse])
def list_discounts(
    is_active: Optional[bool] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Discount)
    if is_active is not None:
        query = query.filter(Discount.is_active == is_active)

    discounts = query.order_by(Discount.created_at.desc()).all()
    results = []
    for d in discounts:
        product_ids = [dp.product_id for dp in d.discount_products]
        results.append({
            "id": d.id,
            "discount_code": d.discount_code,
            "name": d.name,
            "discount_type": d.discount_type,
            "discount_value": d.discount_value,
            "min_purchase_amount": d.min_purchase_amount,
            "min_quantity": d.min_quantity,
            "start_date": d.start_date,
            "end_date": d.end_date,
            "max_usage_limit": d.max_usage_limit,
            "current_usage_count": d.current_usage_count,
            "is_active": d.is_active,
            "created_at": d.created_at,
            "applicable_product_ids": product_ids
        })
    return results

@router.post("", response_model=DiscountResponse, status_code=status.HTTP_201_CREATED)
def create_discount(
    request: DiscountCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Discount).filter(Discount.discount_code == request.discount_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists.")

    new_disc = Discount(
        discount_code=request.discount_code.upper().strip(),
        name=request.name,
        discount_type=request.discount_type,
        discount_value=request.discount_value,
        min_purchase_amount=request.min_purchase_amount,
        min_quantity=request.min_quantity,
        start_date=request.start_date,
        end_date=request.end_date,
        max_usage_limit=request.max_usage_limit,
        current_usage_count=0,
        is_active=request.is_active
    )
    db.add(new_disc)
    db.flush()

    if request.applicable_product_ids:
        for pid in request.applicable_product_ids:
            db.add(DiscountProduct(discount_id=new_disc.id, product_id=pid))

    db.commit()
    db.refresh(new_disc)

    product_ids = [dp.product_id for dp in new_disc.discount_products]
    return {
        "id": new_disc.id,
        "discount_code": new_disc.discount_code,
        "name": new_disc.name,
        "discount_type": new_disc.discount_type,
        "discount_value": new_disc.discount_value,
        "min_purchase_amount": new_disc.min_purchase_amount,
        "min_quantity": new_disc.min_quantity,
        "start_date": new_disc.start_date,
        "end_date": new_disc.end_date,
        "max_usage_limit": new_disc.max_usage_limit,
        "current_usage_count": new_disc.current_usage_count,
        "is_active": new_disc.is_active,
        "created_at": new_disc.created_at,
        "applicable_product_ids": product_ids
    }

@router.put("/{discount_id}", response_model=DiscountResponse)
def update_discount(
    discount_id: int,
    request: DiscountUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    disc = db.query(Discount).filter(Discount.id == discount_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discount rule not found.")

    for field, val in request.dict(exclude_unset=True).items():
        setattr(disc, field, val)

    db.commit()
    db.refresh(disc)

    product_ids = [dp.product_id for dp in disc.discount_products]
    return {
        "id": disc.id,
        "discount_code": disc.discount_code,
        "name": disc.name,
        "discount_type": disc.discount_type,
        "discount_value": disc.discount_value,
        "min_purchase_amount": disc.min_purchase_amount,
        "min_quantity": disc.min_quantity,
        "start_date": disc.start_date,
        "end_date": disc.end_date,
        "max_usage_limit": disc.max_usage_limit,
        "current_usage_count": disc.current_usage_count,
        "is_active": disc.is_active,
        "created_at": disc.created_at,
        "applicable_product_ids": product_ids
    }

@router.post("/validate")
def validate_discount_code(
    code: str,
    subtotal: Decimal,
    quantity: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    discount = db.query(Discount).filter(Discount.discount_code == code.upper().strip()).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Invalid discount code.")

    eligible, amount, message = evaluate_discount(
        db=db,
        discount=discount,
        subtotal=subtotal,
        total_quantity=quantity,
        product_ids=[]
    )

    if not eligible:
        raise HTTPException(status_code=400, detail=message)

    return {
        "valid": True,
        "discount_id": discount.id,
        "discount_code": discount.discount_code,
        "discount_name": discount.name,
        "discount_type": discount.discount_type,
        "discount_value": float(discount.discount_value),
        "discount_amount": float(amount),
        "message": message
    }
