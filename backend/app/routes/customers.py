from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.connection import get_db
from backend.app.models.models import Customer, User, Role
from backend.app.schemas.schemas import CustomerResponse, CustomerCreate, CustomerUpdate
from backend.app.middleware.auth import require_staff_or_admin

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    if status:
        query = query.filter(Customer.status == status)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Customer.company_name.ilike(term),
                Customer.contact_name.ilike(term),
                Customer.email.ilike(term),
                Customer.customer_code.ilike(term)
            )
        )
    return query.order_by(Customer.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return cust

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    request: CustomerCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Customer).filter(Customer.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists.")

    count = db.query(Customer).count()
    code = f"CUST-{count + 1:04d}"

    cust = Customer(
        customer_code=code,
        company_name=request.company_name,
        contact_name=request.contact_name,
        email=request.email,
        phone=request.phone,
        billing_address=request.billing_address,
        tax_number=request.tax_number,
        status=request.status or "active"
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    request: CustomerUpdate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    for field, val in request.dict(exclude_unset=True).items():
        setattr(cust, field, val)

    db.commit()
    db.refresh(cust)
    return cust
