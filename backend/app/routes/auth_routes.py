import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Admin, PasswordReset
from app.schemas import AdminCreate, AdminLogin, Token, AdminResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.auth import hash_password, verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
def register(data: AdminCreate, db: Session = Depends(get_db)):
    existing = db.query(Admin).filter(Admin.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin = Admin(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    access_token = create_access_token(data={"sub": admin.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        admin=AdminResponse.model_validate(admin),
    )


@router.post("/login", response_model=Token)
def login(data: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == data.email).first()
    if not admin or not verify_password(data.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": admin.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        admin=AdminResponse.model_validate(admin),
    )


@router.get("/me", response_model=AdminResponse)
def get_me(admin: Admin = Depends(get_current_admin)):
    return AdminResponse.model_validate(admin)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == data.email).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No account found with this email")

    code = str(random.randint(100000, 999999))
    reset = PasswordReset(
        code=code,
        admin_id=admin.id,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(reset)
    db.commit()

    return {"message": "Reset code generated", "code": code, "expires_in_minutes": 10}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == data.email).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No account found with this email")

    reset = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.admin_id == admin.id,
            PasswordReset.code == data.code,
            PasswordReset.used == False,
            PasswordReset.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    admin.hashed_password = hash_password(data.new_password)
    reset.used = True
    db.commit()

    return {"message": "Password reset successfully"}
