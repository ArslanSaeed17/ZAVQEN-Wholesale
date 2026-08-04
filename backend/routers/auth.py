from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    RegisterIn, LoginIn, TokenOut, UserOut, ForgotPasswordIn,
    ResetPasswordIn, ChangePasswordIn, ProfileUpdateIn,
)
from security import hash_password, verify_password, create_access_token, generate_token
from deps import get_current_user
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists.")

    is_bootstrap_admin = bool(settings.bootstrap_admin_email) and \
        data.email.lower() == settings.bootstrap_admin_email.lower()

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role="admin" if is_bootstrap_admin else "customer",
        is_verified=False,
        verification_token=generate_token(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_link = f"{settings.public_base_url}/auth/verify?token={user.verification_token}"
    # TODO: wire up real email sending (SMTP) here. For now the link is
    # logged server-side, and echoed in the response only outside production
    # so you can test the flow without an email provider configured yet.
    print(f"[verify email] {user.email} -> {verify_link}")

    resp = {"message": "Registered. Check your email to verify your account before logging in."}
    if settings.env != "production":
        resp["dev_verify_link"] = verify_link
    return resp


@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(400, "Invalid or expired verification link.")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified. You can now log in."}


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password.")
    if not user.is_verified:
        raise HTTPException(403, "Please verify your email before logging in.")
    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    # always return the same message whether or not the account exists —
    # don't leak which emails are registered
    generic = {"message": "If that email is registered, a reset link has been sent."}
    if not user:
        return generic

    user.reset_token = generate_token()
    db.commit()
    reset_link = f"{settings.frontend_url}/reset-password.html?token={user.reset_token}"
    print(f"[password reset] {user.email} -> {reset_link}")
    if settings.env != "production":
        generic["dev_reset_link"] = reset_link
    return generic


@router.post("/reset-password")
def reset_password(data: ResetPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user:
        raise HTTPException(400, "Invalid or expired reset link.")
    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    db.commit()
    return {"message": "Password updated. You can now log in."}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(data: ProfileUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(data: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated."}
