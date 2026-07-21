# -*- coding: utf-8 -*-

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.api.auth import ADMIN_EMAIL, require_admin
from backend.app.core.database import get_db
from backend.app.models import TaiKhoan


router = APIRouter(
    prefix="/api/admin/accounts",
    tags=["Admin - Accounts"],
)


class CapNhatTrangThaiTaiKhoanRequest(BaseModel):
    trangThai: str


class CapNhatVaiTroTaiKhoanRequest(BaseModel):
    vaiTro: str


def chuan_hoa_email(email: Optional[str]) -> str:
    return str(email or "").strip().lower()


def chuyen_tai_khoan_sang_dict(tai_khoan: TaiKhoan) -> dict:
    return {
        "maTaiKhoan": tai_khoan.maTaiKhoan,
        "hoTen": tai_khoan.hoTen,
        "email": tai_khoan.email,
        "vaiTro": tai_khoan.vaiTro,
        "trangThai": tai_khoan.trangThai,
        "ngayTao": (
            tai_khoan.ngayTao.isoformat()
            if tai_khoan.ngayTao
            else None
        ),
        "ngayCapNhat": (
            tai_khoan.ngayCapNhat.isoformat()
            if tai_khoan.ngayCapNhat
            else None
        ),
    }


def lay_tai_khoan_hoac_bao_loi(
    ma_tai_khoan: int,
    db: Session,
) -> TaiKhoan:
    tai_khoan = (
        db.query(TaiKhoan)
        .filter(TaiKhoan.maTaiKhoan == ma_tai_khoan)
        .first()
    )

    if not tai_khoan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản",
        )

    return tai_khoan


def kiem_tra_tai_khoan_quan_tri_co_dinh(
    tai_khoan: TaiKhoan,
) -> None:
    if chuan_hoa_email(tai_khoan.email) == ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể thay đổi tài khoản quản trị mặc định",
        )


@router.get("")
def lay_danh_sach_tai_khoan(
    tuKhoa: str = Query(default="", max_length=255),
    vaiTro: str = Query(default="all"),
    trangThai: str = Query(default="all"),
    trang: int = Query(default=1, ge=1),
    kichThuocTrang: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    truy_van = db.query(TaiKhoan)

    tu_khoa_chuan_hoa = str(tuKhoa or "").strip()

    if tu_khoa_chuan_hoa:
        mau_tim_kiem = f"%{tu_khoa_chuan_hoa}%"

        truy_van = truy_van.filter(
            or_(
                TaiKhoan.hoTen.ilike(mau_tim_kiem),
                TaiKhoan.email.ilike(mau_tim_kiem),
            )
        )

    vai_tro_chuan_hoa = str(vaiTro or "").strip().lower()

    if vai_tro_chuan_hoa in {"user", "admin"}:
        truy_van = truy_van.filter(
            TaiKhoan.vaiTro == vai_tro_chuan_hoa
        )

    trang_thai_chuan_hoa = str(trangThai or "").strip().lower()

    if trang_thai_chuan_hoa in {"active", "inactive"}:
        truy_van = truy_van.filter(
            TaiKhoan.trangThai == trang_thai_chuan_hoa
        )

    tong_so_tai_khoan = truy_van.count()
    vi_tri_bat_dau = (trang - 1) * kichThuocTrang

    danh_sach_tai_khoan = (
        truy_van
        .order_by(TaiKhoan.ngayTao.desc(), TaiKhoan.maTaiKhoan.desc())
        .offset(vi_tri_bat_dau)
        .limit(kichThuocTrang)
        .all()
    )

    tong_so_trang = (
        (tong_so_tai_khoan + kichThuocTrang - 1)
        // kichThuocTrang
    )

    return {
        "success": True,
        "data": {
            "items": [
                chuyen_tai_khoan_sang_dict(tai_khoan)
                for tai_khoan in danh_sach_tai_khoan
            ],
            "pagination": {
                "trangHienTai": trang,
                "kichThuocTrang": kichThuocTrang,
                "tongSoTaiKhoan": tong_so_tai_khoan,
                "tongSoTrang": tong_so_trang,
            },
        },
    }


@router.get("/{ma_tai_khoan}")
def lay_chi_tiet_tai_khoan(
    ma_tai_khoan: int,
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    tai_khoan = lay_tai_khoan_hoac_bao_loi(
        ma_tai_khoan,
        db,
    )

    return {
        "success": True,
        "data": chuyen_tai_khoan_sang_dict(tai_khoan),
    }


@router.patch("/{ma_tai_khoan}/status")
def cap_nhat_trang_thai_tai_khoan(
    ma_tai_khoan: int,
    request: CapNhatTrangThaiTaiKhoanRequest,
    db: Session = Depends(get_db),
    current_admin: TaiKhoan = Depends(require_admin),
):
    tai_khoan = lay_tai_khoan_hoac_bao_loi(
        ma_tai_khoan,
        db,
    )

    if tai_khoan.maTaiKhoan == current_admin.maTaiKhoan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể vô hiệu hóa tài khoản đang đăng nhập",
        )

    kiem_tra_tai_khoan_quan_tri_co_dinh(tai_khoan)

    trang_thai_moi = str(request.trangThai or "").strip().lower()

    if trang_thai_moi not in {"active", "inactive"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái chỉ được phép là active hoặc inactive",
        )

    tai_khoan.trangThai = trang_thai_moi

    db.commit()
    db.refresh(tai_khoan)

    return {
        "success": True,
        "message": (
            "Đã mở khóa tài khoản"
            if trang_thai_moi == "active"
            else "Đã khóa tài khoản"
        ),
        "data": chuyen_tai_khoan_sang_dict(tai_khoan),
    }


@router.patch("/{ma_tai_khoan}/role")
def cap_nhat_vai_tro_tai_khoan(
    ma_tai_khoan: int,
    request: CapNhatVaiTroTaiKhoanRequest,
    db: Session = Depends(get_db),
    current_admin: TaiKhoan = Depends(require_admin),
):
    tai_khoan = lay_tai_khoan_hoac_bao_loi(
        ma_tai_khoan,
        db,
    )

    if tai_khoan.maTaiKhoan == current_admin.maTaiKhoan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể thay đổi vai trò tài khoản đang đăng nhập",
        )

    kiem_tra_tai_khoan_quan_tri_co_dinh(tai_khoan)

    vai_tro_moi = str(request.vaiTro or "").strip().lower()

    if vai_tro_moi not in {"user", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vai trò chỉ được phép là user hoặc admin",
        )

    tai_khoan.vaiTro = vai_tro_moi

    db.commit()
    db.refresh(tai_khoan)

    return {
        "success": True,
        "message": "Đã cập nhật vai trò tài khoản",
        "data": chuyen_tai_khoan_sang_dict(tai_khoan),
    }

