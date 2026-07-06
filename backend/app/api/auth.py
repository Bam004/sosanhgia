# -*- coding: utf-8 -*-
from typing import cast
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

security = HTTPBearer()

class RegisterRequest(BaseModel):
    hoTen: str
    email: EmailStr
    matKhau: str
    xacNhanMatKhau: str

class LoginRequest(BaseModel):
    email: EmailStr
    matKhau: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    user = db.query(TaiKhoan).filter(TaiKhoan.maTaiKhoan == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    if not request.email:
        return JSONResponse(status_code=400, content={"success": False, "message": "Email không được rỗng"})
    
    if len(request.matKhau) < 6:
        return JSONResponse(status_code=400, content={"success": False, "message": "Mật khẩu phải từ 6 ký tự trở lên"})
        
    if request.matKhau != request.xacNhanMatKhau:
        return JSONResponse(status_code=400, content={"success": False, "message": "Xác nhận mật khẩu không khớp"})

    existing_user = db.query(TaiKhoan).filter(TaiKhoan.email == request.email).first()
    if existing_user:
        return JSONResponse(status_code=400, content={"success": False, "message": "Email đã tồn tại trong hệ thống"})

    hashed_pw = hash_password(request.matKhau)
    new_user = TaiKhoan(
        hoTen=request.hoTen,
        email=request.email,
        matKhauHash=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": "Đăng ký thành công",
        "data": {
            "maTaiKhoan": new_user.maTaiKhoan,
            "hoTen": new_user.hoTen,
            "email": new_user.email,
            "vaiTro": new_user.vaiTro
        }
    }

@router.post("/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(TaiKhoan).filter(TaiKhoan.email == request.email).first()
    if not user:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Sai email hoặc mật khẩu"}
        )

    hashed_password = cast(str, user.matKhauHash)

    if not verify_password(request.matKhau, hashed_password):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Sai email hoặc mật khẩu"}
        )

    access_token = create_access_token(data={"sub": str(user.maTaiKhoan)})

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
                "vaiTro": user.vaiTro
            }
        }
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
