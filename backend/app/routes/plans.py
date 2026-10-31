from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.models import Plan, Product, User
from backend.app.schemas.schemas import PlanResponse, PlanCreate, PlanUpdate
from backend.app.middleware.auth import require_admin, get_current_user

router = APIRouter(prefix="/plans", tags=["Subscription Plans"])

@router.get("", response_model=List[PlanResponse])
def list_plans(
    frequency: Optional[str] = None,
    status: Optional[str] = None,
    product_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Plan)
    if status:
        query = query.filter(Plan.status == status)
    if frequency:
        query = query.filter(Plan.billing_frequency == frequency)
    if product_id:
        query = query.filter(Plan.product_id == product_id)

    plans = query.order_by(Plan.created_at.desc()).all()
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

@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Plan).filter(Plan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plan not found.")
    return {
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
    }

@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    request: PlanCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == request.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Associated product not found.")

    existing = db.query(Plan).filter(Plan.plan_code == request.plan_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plan with this code already exists.")

    new_plan = Plan(
        plan_code=request.plan_code,
        plan_name=request.plan_name,
        product_id=request.product_id,
        plan_price=request.plan_price,
        billing_frequency=request.billing_frequency,
        minimum_quantity=request.minimum_quantity,
        start_availability_date=request.start_availability_date,
        end_availability_date=request.end_availability_date,
        auto_close=request.auto_close,
        early_closure_allowed=request.early_closure_allowed,
        pause_allowed=request.pause_allowed,
        renewal_allowed=request.renewal_allowed,
        status=request.status or "active"
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return {
        "id": new_plan.id,
        "plan_code": new_plan.plan_code,
        "plan_name": new_plan.plan_name,
        "product_id": new_plan.product_id,
        "product_name": prod.name,
        "plan_price": new_plan.plan_price,
        "billing_frequency": new_plan.billing_frequency,
        "minimum_quantity": new_plan.minimum_quantity,
        "start_availability_date": new_plan.start_availability_date,
        "end_availability_date": new_plan.end_availability_date,
        "auto_close": new_plan.auto_close,
        "early_closure_allowed": new_plan.early_closure_allowed,
        "pause_allowed": new_plan.pause_allowed,
        "renewal_allowed": new_plan.renewal_allowed,
        "status": new_plan.status,
        "created_at": new_plan.created_at,
        "updated_at": new_plan.updated_at
    }

@router.put("/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: int,
    request: PlanUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    for field, val in request.dict(exclude_unset=True).items():
        setattr(plan, field, val)

    db.commit()
    db.refresh(plan)

    return {
        "id": plan.id,
        "plan_code": plan.plan_code,
        "plan_name": plan.plan_name,
        "product_id": plan.product_id,
        "product_name": plan.product.name if plan.product else None,
        "plan_price": plan.plan_price,
        "billing_frequency": plan.billing_frequency,
        "minimum_quantity": plan.minimum_quantity,
        "start_availability_date": plan.start_availability_date,
        "end_availability_date": plan.end_availability_date,
        "auto_close": plan.auto_close,
        "early_closure_allowed": plan.early_closure_allowed,
        "pause_allowed": plan.pause_allowed,
        "renewal_allowed": plan.renewal_allowed,
        "status": plan.status,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at
    }

@router.patch("/{plan_id}/toggle-status")
def toggle_plan_status(
    plan_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    plan.status = "inactive" if plan.status == "active" else "active"
    db.commit()
    return {"message": f"Plan status updated to {plan.status}."}
