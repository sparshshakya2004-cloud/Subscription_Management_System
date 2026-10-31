from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.models import User, Role, ActivityLog
from backend.app.schemas.schemas import UserResponse, StaffCreateRequest
from backend.app.utils.security import get_password_hash, validate_password_strength
from backend.app.middleware.auth import require_admin

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).join(Role)
    if role:
        query = query.filter(Role.name == role)
    if status:
        query = query.filter(User.status == status)

    users = query.order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        results.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "phone": u.phone,
            "role_id": u.role_id,
            "role_name": u.role.name,
            "status": u.status,
            "customer_id": u.customer.id if u.customer else None,
            "created_at": u.created_at
        })
    return results

@router.post("/staff", response_model=UserResponse)
def create_staff_user(
    request: StaffCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Only Admin can create staff accounts!
    validate_password_strength(request.password)

    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered.")

    staff_role = db.query(Role).filter(Role.name == "Internal Staff").first()
    if not staff_role:
        raise HTTPException(status_code=500, detail="Internal Staff role not found.")

    new_user = User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        full_name=request.full_name,
        phone=request.phone,
        role_id=staff_role.id,
        status="active"
    )
    db.add(new_user)
    db.flush()

    log = ActivityLog(
        user_id=admin_user.id,
        action="CREATE_STAFF_USER",
        entity_type="users",
        entity_id=new_user.id,
        details=f"Admin {admin_user.email} created staff account for {new_user.email}."
    )
    db.add(log)
    db.commit()

    return {
        "id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "phone": new_user.phone,
        "role_id": new_user.role_id,
        "role_name": staff_role.name,
        "status": new_user.status,
        "customer_id": None,
        "created_at": new_user.created_at
    }

@router.patch("/{user_id}/status")
def toggle_user_status(
    user_id: int,
    status: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot alter status of the currently logged in administrator.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if status not in ["active", "inactive", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid user status.")

    user.status = status
    db.commit()
    return {"message": f"User status updated to {status}."}
