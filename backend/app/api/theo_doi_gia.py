# -*- coding: utf-8 -*-
from datetime import datetime

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models import SanPhamChuanHoa, SanPhamTho, TaiKhoan, TheoDoiGia
from backend.app.schemas.theo_doi_gia import TheoDoiGiaCreate, TheoDoiGiaUpdate

router = APIRouter(
    prefix="/api/theo-doi-gia",
    tags=["Theo dõi giá"]
)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_theo_doi_gia(
    request: TheoDoiGiaCreate,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user)
):
    if request.giaMongMuon is None or request.giaMongMuon <= 0:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Giá mong muốn bắt buộc phải lớn hơn 0"
            }
        )

    product = (
        db.query(SanPhamChuanHoa)
        .filter(SanPhamChuanHoa.maSPCH == request.maSPCH)
        .first()
    )

    if not product:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "message": "Không tìm thấy sản phẩm chuẩn hóa"
            }
        )

    existing_follow = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.maTaiKhoan == current_user.maTaiKhoan,
            TheoDoiGia.maSPCH == request.maSPCH
        )
        .first()
    )

    if existing_follow:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "message": "Sản phẩm này đã có trong danh sách theo dõi"
            }
        )

    new_follow = TheoDoiGia(
        maTaiKhoan=current_user.maTaiKhoan,
        maSPCH=request.maSPCH,
        giaMongMuon=request.giaMongMuon,
        trangThai=True
    )

    try:
        db.add(new_follow)
        db.commit()
        db.refresh(new_follow)
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "message": "Sản phẩm này đã có trong danh sách theo dõi"
            }
        )

    return {
        "success": True,
        "message": "Theo dõi sản phẩm thành công",
        "data": {
            "maTheoDoi": new_follow.maTheoDoi,
            "maTaiKhoan": new_follow.maTaiKhoan,
            "maSPCH": new_follow.maSPCH,
            "giaMongMuon": new_follow.giaMongMuon,
            "trangThai": new_follow.trangThai,
            "ngayTheoDoi": new_follow.ngayTheoDoi
        }
    }


@router.get("")
def get_my_theo_doi_gia(
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user)
):
    price_subquery = (
        db.query(
            SanPhamTho.maSPCH.label("maSPCH"),
            func.min(SanPhamTho.giaHienTai).label("giaThapNhat"),
            func.max(SanPhamTho.giaHienTai).label("giaCaoNhat")
        )
        .filter(SanPhamTho.maSPCH.isnot(None))
        .group_by(SanPhamTho.maSPCH)
        .subquery()
    )

    rows = (
        db.query(
            TheoDoiGia,
            SanPhamChuanHoa,
            price_subquery.c.giaThapNhat,
            price_subquery.c.giaCaoNhat
        )
        .join(
            SanPhamChuanHoa,
            TheoDoiGia.maSPCH == SanPhamChuanHoa.maSPCH
        )
        .outerjoin(
            price_subquery,
            TheoDoiGia.maSPCH == price_subquery.c.maSPCH
        )
        .filter(
            TheoDoiGia.maTaiKhoan == current_user.maTaiKhoan,
            TheoDoiGia.trangThai == True
        )
        .order_by(TheoDoiGia.ngayTheoDoi.desc())
        .all()
    )

    data = []

    for follow, product, gia_thap_nhat, gia_cao_nhat in rows:
        trang_thai_hien_thi = "dang_theo_doi"
        
        if follow.giaMongMuon is None or follow.giaMongMuon <= 0:
            trang_thai_hien_thi = "chua_dat_gia_mong_muon"
        elif follow.daThongBao:
            trang_thai_hien_thi = "da_thong_bao"
        elif gia_thap_nhat is not None and float(gia_thap_nhat) <= float(follow.giaMongMuon):
            trang_thai_hien_thi = "da_dat_gia"
            
        data.append({
            "maTheoDoi": follow.maTheoDoi,
            "maSPCH": product.maSPCH,
            "tenChuanHoa": product.tenChuanHoa,
            "thuongHieu": product.thuongHieu,
            "dungLuong": product.dungLuong,
            "anhDaiDien": product.anhDaiDien,
            "giaThapNhat": gia_thap_nhat,
            "giaCaoNhat": gia_cao_nhat,
            "giaMongMuon": follow.giaMongMuon,
            "trangThai": follow.trangThai,
            "daThongBao": follow.daThongBao,
            "ngayThongBao": follow.ngayThongBao,
            "giaLucThongBao": follow.giaLucThongBao,
            "trangThaiHienThi": trang_thai_hien_thi,
            "ngayTheoDoi": follow.ngayTheoDoi
        })

    return {
        "success": True,
        "data": data
    }


@router.get("/check/{maSPCH}")
def check_theo_doi_gia(
    maSPCH: int,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user)
):
    follow = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.maTaiKhoan == current_user.maTaiKhoan,
            TheoDoiGia.maSPCH == maSPCH,
            TheoDoiGia.trangThai == True
        )
        .first()
    )

    return {
        "success": True,
        "data": {
            "isFollowing": follow is not None,
            "maTheoDoi": follow.maTheoDoi if follow else None,
            "giaMongMuon": float(follow.giaMongMuon) if follow and follow.giaMongMuon else None
        }
    }


@router.put("/{maTheoDoi}")
def update_theo_doi_gia(
    maTheoDoi: int,
    request: TheoDoiGiaUpdate,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user)
):
    follow = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.maTheoDoi == maTheoDoi,
            TheoDoiGia.maTaiKhoan == current_user.maTaiKhoan
        )
        .first()
    )

    if not follow:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "message": "Không tìm thấy sản phẩm theo dõi"
            }
        )

    if request.giaMongMuon is not None:
        if request.giaMongMuon <= 0:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "success": False,
                    "message": "Giá mong muốn phải lớn hơn 0"
                }
            )
        
        # Reset tracking notification if price changes
        if follow.giaMongMuon != request.giaMongMuon:
            follow.daThongBao = False
            follow.ngayThongBao = None
            follow.giaLucThongBao = None
            
        follow.giaMongMuon = request.giaMongMuon

    if request.trangThai is not None:
        follow.trangThai = request.trangThai

    follow.ngayCapNhat = datetime.utcnow()

    db.commit()
    db.refresh(follow)

    return {
        "success": True,
        "message": "Cập nhật theo dõi giá thành công",
        "data": {
            "maTheoDoi": follow.maTheoDoi,
            "maTaiKhoan": follow.maTaiKhoan,
            "maSPCH": follow.maSPCH,
            "giaMongMuon": follow.giaMongMuon,
            "trangThai": follow.trangThai,
            "daThongBao": follow.daThongBao,
            "ngayThongBao": follow.ngayThongBao,
            "giaLucThongBao": follow.giaLucThongBao,
            "ngayTheoDoi": follow.ngayTheoDoi,
            "ngayCapNhat": follow.ngayCapNhat
        }
    }


@router.delete("/{maTheoDoi}")
def delete_theo_doi_gia(
    maTheoDoi: int,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(get_current_user)
):
    follow = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.maTheoDoi == maTheoDoi,
            TheoDoiGia.maTaiKhoan == current_user.maTaiKhoan
        )
        .first()
    )

    if not follow:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "message": "Không tìm thấy sản phẩm theo dõi"
            }
        )

    db.delete(follow)
    db.commit()

    return {
        "success": True,
        "message": "Đã hủy theo dõi sản phẩm"
    }
