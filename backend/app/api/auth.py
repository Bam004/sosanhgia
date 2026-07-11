# -*- coding: utf-8 -*-
from typing import cast
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from backend.app.core.database import get_db
from backend.app.models import TaiKhoan
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"]
)

security = HTTPBearer(auto_error=False)

class RegisterRequest(BaseModel):
    hoTen: str
    email: EmailStr
    matKhau: str
    xacNhanMatKhau: str

class LoginRequest(BaseModel):
    email: EmailStr
    matKhau: str


def normalize_email(email: str) -> str:
    return str(email).strip().lower()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> TaiKhoan:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu thông tin xác thực",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")

    try:
        normalized_user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin tài khoản hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = (
        db.query(TaiKhoan)
        .filter(TaiKhoan.maTaiKhoan == normalized_user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không còn tồn tại",
            headers={"WWW-Authenticate": "Bearer"},
        )

    account_status = str(user.trangThai or "").strip().lower()

    if account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )

    return user


def require_admin(current_user: TaiKhoan = Depends(get_current_user)) -> TaiKhoan:
    user_role = str(current_user.vaiTro or "").strip().lower()

    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền quản trị viên",
        )

    return current_user

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    normalized_name = request.hoTen.strip()
    normalized_email = normalize_email(request.email)

    if not normalized_name:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "message": "Họ tên không được để trống",
            },
        )

    if len(request.matKhau) < 6:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "message": "Mật khẩu phải từ 6 ký tự trở lên",
            },
        )

    if request.matKhau != request.xacNhanMatKhau:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "message": "Xác nhận mật khẩu không khớp",
            },
        )

    existing_user = (
        db.query(TaiKhoan)
        .filter(TaiKhoan.email == normalized_email)
        .first()
    )

    if existing_user:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "message": "Email đã tồn tại trong hệ thống",
            },
        )

    new_user = TaiKhoan(
        hoTen=normalized_name,
        email=normalized_email,
        matKhauHash=hash_password(request.matKhau),
        vaiTro="user",
        trangThai="active",
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()

        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "message": "Email đã tồn tại trong hệ thống",
            },
        )

    return {
        "success": True,
        "message": "Đăng ký thành công",
        "data": {
            "maTaiKhoan": new_user.maTaiKhoan,
            "hoTen": new_user.hoTen,
            "email": new_user.email,
            "vaiTro": new_user.vaiTro,
        },
    }

@router.post("/login")
def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    normalized_email = normalize_email(request.email)

    user = (
        db.query(TaiKhoan)
        .filter(TaiKhoan.email == normalized_email)
        .first()
    )

    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai email hoặc mật khẩu",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    hashed_password = cast(str, user.matKhauHash)

    if not verify_password(request.matKhau, hashed_password):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai email hoặc mật khẩu",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    account_status = str(user.trangThai or "").strip().lower()

    if account_status != "active":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "success": False,
                "message": "Tài khoản đã bị vô hiệu hóa",
            },
        )

    access_token = create_access_token(
        data={"sub": str(user.maTaiKhoan)}
    )

    return {
        "success": True,
        "message": "Đăng nhập thành công",
        "data": {
            "accessToken": access_token,
            "tokenType": "bearer",
            "user": {
                "maTaiKhoan": user.maTaiKhoan,
                "hoTen": user.hoTen,
                "email": user.email,
                "vaiTro": user.vaiTro,
            },
        },
    }

@router.get("/me")
def get_user_me(current_user: TaiKhoan = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "maTaiKhoan": current_user.maTaiKhoan,
            "hoTen": current_user.hoTen,
            "email": current_user.email,
            "vaiTro": current_user.vaiTro
        }
    }

@router.post("/logout")
def logout_user():
    return {
        "success": True,
        "message": "Đăng xuất thành công"
    }
