from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.models import Tax, User
from backend.app.schemas.schemas import TaxResponse, TaxCreate, TaxUpdate
from backend.app.middleware.auth import require_admin, get_current_user

router = APIRouter(prefix="/taxes", tags=["Tax Management"])

@router.get("", response_model=List[TaxResponse])
def list_taxes(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Tax)
    if is_active is not None:
        query = query.filter(Tax.is_active == is_active)
    return query.order_by(Tax.id.asc()).all()

@router.post("", response_model=TaxResponse, status_code=status.HTTP_201_CREATED)
def create_tax(
    request: TaxCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Tax).filter(Tax.tax_name == request.tax_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A tax rule with this name already exists.")

    new_tax = Tax(
        tax_name=request.tax_name,
        tax_rate=request.tax_rate,
        tax_type=request.tax_type,
        description=request.description,
        is_active=request.is_active
    )
    db.add(new_tax)
    db.commit()
    db.refresh(new_tax)
    return new_tax

@router.put("/{tax_id}", response_model=TaxResponse)
def update_tax(
    tax_id: int,
    request: TaxUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rule not found.")

    for field, val in request.dict(exclude_unset=True).items():
        setattr(tax, field, val)

    db.commit()
    db.refresh(tax)
    return tax

@router.patch("/{tax_id}/toggle-status")
def toggle_tax_status(
    tax_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rule not found.")

    tax.is_active = not tax.is_active
    db.commit()
    return {"message": f"Tax rule '{tax.tax_name}' is now {'active' if tax.is_active else 'inactive'}."}
