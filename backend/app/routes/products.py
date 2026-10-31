from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.connection import get_db
from backend.app.models.models import Product, ProductVariant, ProductVariantOption, User
from backend.app.schemas.schemas import (
    ProductResponse, ProductCreate, ProductUpdate,
    ProductVariantCreate, ProductVariantResponse,
    ProductVariantOptionCreate, ProductVariantOptionResponse
)
from backend.app.middleware.auth import require_admin, get_current_user

router = APIRouter(prefix="/products", tags=["Products & Variants"])

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = None,
    product_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if status:
        query = query.filter(Product.status == status)
    if product_type:
        query = query.filter(Product.product_type == product_type)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.product_code.ilike(term)
            )
        )
    return query.order_by(Product.created_at.desc()).all()

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")
    return prod

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    request: ProductCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Product).filter(Product.product_code == request.product_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this code already exists.")

    new_prod = Product(
        product_code=request.product_code,
        name=request.name,
        product_type=request.product_type,
        sales_price=request.sales_price,
        cost_price=request.cost_price,
        product_notes=request.product_notes,
        status=request.status or "active"
    )
    db.add(new_prod)
    db.flush()

    # Add variants if provided in creation request
    if request.variants:
        for v in request.variants:
            p_variant = ProductVariant(
                product_id=new_prod.id,
                variant_name=v.variant_name
            )
            db.add(p_variant)
            db.flush()
            for opt in v.options:
                p_opt = ProductVariantOption(
                    variant_id=p_variant.id,
                    option_name=opt.option_name,
                    price_adjustment=opt.price_adjustment
                )
                db.add(p_opt)

    db.commit()
    db.refresh(new_prod)
    return new_prod

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    request: ProductUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    for field, val in request.dict(exclude_unset=True).items():
        setattr(prod, field, val)

    db.commit()
    db.refresh(prod)
    return prod

@router.delete("/{product_id}")
def archive_product(
    product_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Archive rather than hard-delete to maintain historical invoice integrity
    prod.status = "archived"
    db.commit()
    return {"message": f"Product {prod.name} successfully archived."}

# Dynamic Variant Management endpoints
@router.post("/{product_id}/variants", response_model=ProductVariantResponse)
def add_product_variant(
    product_id: int,
    request: ProductVariantCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    variant = ProductVariant(product_id=product_id, variant_name=request.variant_name)
    db.add(variant)
    db.flush()

    for opt in request.options:
        db.add(ProductVariantOption(
            variant_id=variant.id,
            option_name=opt.option_name,
            price_adjustment=opt.price_adjustment
        ))

    db.commit()
    db.refresh(variant)
    return variant

@router.post("/variants/{variant_id}/options", response_model=ProductVariantOptionResponse)
def add_variant_option(
    variant_id: int,
    request: ProductVariantOptionCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found.")

    opt = ProductVariantOption(
        variant_id=variant_id,
        option_name=request.option_name,
        price_adjustment=request.price_adjustment
    )
    db.add(opt)
    db.commit()
    db.refresh(opt)
    return opt

@router.get("/{product_id}/calculate-price")
def calculate_product_price(
    product_id: int,
    option_ids: Optional[str] = Query(None, description="Comma-separated option IDs"),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    base_price = prod.sales_price
    adjustments = Decimal("0.00")
    selected_options = []

    if option_ids:
        ids = [int(i.strip()) for i in option_ids.split(",") if i.strip().isdigit()]
        options = db.query(ProductVariantOption).filter(ProductVariantOption.id.in_(ids)).all()
        for opt in options:
            adjustments += opt.price_adjustment
            selected_options.append({
                "option_id": opt.id,
                "option_name": opt.option_name,
                "price_adjustment": float(opt.price_adjustment)
            })

    final_price = base_price + adjustments

    return {
        "product_id": prod.id,
        "product_name": prod.name,
        "base_price": float(base_price),
        "total_adjustments": float(adjustments),
        "final_price": float(final_price),
        "selected_options": selected_options
    }
