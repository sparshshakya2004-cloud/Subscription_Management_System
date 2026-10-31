from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.models import User, Customer, Role, PasswordResetToken, ActivityLog
from backend.app.schemas.schemas import (
    LoginRequest, TokenResponse, RegisterRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserResponse
)
from backend.app.utils.security import (
    verify_password, get_password_hash, validate_password_strength,
    create_access_token, generate_random_token
)
from backend.app.middleware.auth import get_current_user
from backend.app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}. Please contact support."
        )

    customer_id = user.customer.id if user.customer else None

    # Generate JWT
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.name,
        "name": user.full_name,
        "customer_id": customer_id
    }
    token = create_access_token(data=token_data)

    # Activity log
    log = ActivityLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity_type="users",
        entity_id=user.id,
        details=f"User {user.email} logged in successfully."
    )
    db.add(log)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.name,
            "customer_id": customer_id
        }
    }

@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Validate password strength
    validate_password_strength(request.password)

    # 2. Check email uniqueness
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Customer Role
    customer_role = db.query(Role).filter(Role.name == "Customer").first()
    if not customer_role:
        raise HTTPException(status_code=500, detail="Customer role not initialized in database.")

    hashed_pw = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        password_hash=hashed_pw,
        full_name=request.full_name,
        phone=request.phone,
        role_id=customer_role.id,
        status="active"
    )
    db.add(new_user)
    db.flush()

    # Create linked customer record
    cust_count = db.query(Customer).count()
    code = f"CUST-{cust_count + 1:04d}"
    company = request.company_name or f"{request.full_name}'s Organization"

    new_cust = Customer(
        user_id=new_user.id,
        customer_code=code,
        company_name=company,
        contact_name=request.full_name,
        email=request.email,
        phone=request.phone,
        billing_address=request.billing_address,
        status="active"
    )
    db.add(new_cust)
    db.flush()

    # Log activity
    log = ActivityLog(
        user_id=new_user.id,
        action="CUSTOMER_REGISTRATION",
        entity_type="users",
        entity_id=new_user.id,
        details=f"Customer registered account {request.email} (Customer Code: {code})."
    )
    db.add(log)
    db.commit()

    token_data = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": customer_role.name,
        "name": new_user.full_name,
        "customer_id": new_cust.id
    }
    token = create_access_token(data=token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": customer_role.name,
            "customer_id": new_cust.id
        }
    }

@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role.name,
        "status": current_user.status,
        "customer_id": current_user.customer.id if current_user.customer else None,
        "customer_code": current_user.customer.customer_code if current_user.customer else None,
        "company_name": current_user.customer.company_name if current_user.customer else None,
        "created_at": current_user.created_at
    }

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Prevent user enumeration in security context, but notify success message
        return {
            "message": "If this email is registered in our system, a password reset link has been dispatched."
        }

    raw_token = generate_random_token(32)
    expires = datetime.utcnow() + timedelta(hours=1)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=expires,
        is_used=False
    )
    db.add(reset_token)
    db.commit()

    result = send_password_reset_email(to_email=user.email, reset_token=raw_token)

    return {
        "message": "Password reset instructions have been dispatched.",
        "dev_info": result if result.get("mode") == "development" else None
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    validate_password_strength(request.new_password)

    token_record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == request.token)
        .filter(PasswordResetToken.is_used == False)
        .first()
    )

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token."
        )

    if token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one."
        )

    user = token_record.user
    user.password_hash = get_password_hash(request.new_password)
    token_record.is_used = True

    log = ActivityLog(
        user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        entity_type="users",
        entity_id=user.id,
        details=f"Password successfully reset for {user.email}."
    )
    db.add(log)
    db.commit()

    return {"message": "Password reset successfully. You may now login with your new password."}
