# -*- coding: utf-8 -*-

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.api.auth import require_admin
from backend.app.core.database import get_db
from backend.app.core.datetime_utils import utc_now_naive
from backend.app.models import (
    SanPhamChuanHoa,
    TaiKhoan,
    TheoDoiGia,
)
from backend.app.services.price_alert_service import (
    get_current_lowest_offer,
)


router = APIRouter(
    prefix="/api/admin/price-tracking",
    tags=["Admin - Price Tracking"],
)


class CapNhatTrangThaiTheoDoiRequest(BaseModel):
    trangThai: bool


def dinh_dang_ngay(gia_tri):
    return gia_tri.isoformat() if gia_tri else None


def lay_trang_thai_hien_thi(
    theo_doi: TheoDoiGia,
    gia_hien_tai: Optional[float],
) -> str:
    if not theo_doi.trangThai:
        return "da_tam_dung"

    if (
        theo_doi.giaMongMuon is None
        or float(theo_doi.giaMongMuon) <= 0
    ):
        return "chua_dat_gia_mong_muon"

    if theo_doi.daThongBao:
        return "da_thong_bao"

    if (
        gia_hien_tai is not None
        and gia_hien_tai <= float(theo_doi.giaMongMuon)
    ):
        return "da_dat_gia"

    return "dang_theo_doi"


def chuyen_theo_doi_sang_dict(
    theo_doi: TheoDoiGia,
    tai_khoan: TaiKhoan,
    san_pham: SanPhamChuanHoa,
    db: Session,
) -> dict:
    offer = get_current_lowest_offer(
        theo_doi.maSPCH,
        db,
    )

    gia_hien_tai = (
        float(offer["giaThapNhat"])
        if offer and offer.get("giaThapNhat") is not None
        else None
    )

    gia_mong_muon = (
        float(theo_doi.giaMongMuon)
        if theo_doi.giaMongMuon is not None
        else None
    )

    gia_luc_thong_bao = (
        float(theo_doi.giaLucThongBao)
        if theo_doi.giaLucThongBao is not None
        else None
    )

    return {
        "maTheoDoi": theo_doi.maTheoDoi,
        "maTaiKhoan": theo_doi.maTaiKhoan,
        "maSPCH": theo_doi.maSPCH,
        "nguoiDung": {
            "maTaiKhoan": tai_khoan.maTaiKhoan,
            "hoTen": tai_khoan.hoTen,
            "email": tai_khoan.email,
            "trangThai": tai_khoan.trangThai,
        },
        "sanPham": {
            "maSPCH": san_pham.maSPCH,
            "tenChuanHoa": san_pham.tenChuan,
            "thuongHieu": san_pham.thuongHieu,
            "dungLuong": san_pham.dungLuong,
            "anhDaiDien": san_pham.hinhAnhChinh,
        },
        "giaHienTai": gia_hien_tai,
        "giaMongMuon": gia_mong_muon,
        "trangThai": bool(theo_doi.trangThai),
        "daThongBao": bool(theo_doi.daThongBao),
        "trangThaiHienThi": lay_trang_thai_hien_thi(
            theo_doi,
            gia_hien_tai,
        ),
        "ngayTheoDoi": dinh_dang_ngay(
            theo_doi.ngayTheoDoi
        ),
        "ngayCapNhat": dinh_dang_ngay(
            theo_doi.ngayCapNhat
        ),
        "ngayThongBao": dinh_dang_ngay(
            theo_doi.ngayThongBao
        ),
        "giaLucThongBao": gia_luc_thong_bao,
        "nguonGiaThapNhat": (
            offer.get("sourceName")
            if offer
            else None
        ),
        "linkGoc": (
            offer.get("linkGoc")
            if offer
            else None
        ),
    }


def lay_theo_doi_hoac_bao_loi(
    ma_theo_doi: int,
    db: Session,
) -> TheoDoiGia:
    theo_doi = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.maTheoDoi == ma_theo_doi
        )
        .first()
    )

    if not theo_doi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu theo dõi giá",
        )

    return theo_doi


def lay_du_lieu_lien_quan(
    theo_doi: TheoDoiGia,
    db: Session,
):
    tai_khoan = (
        db.query(TaiKhoan)
        .filter(
            TaiKhoan.maTaiKhoan
            == theo_doi.maTaiKhoan
        )
        .first()
    )

    san_pham = (
        db.query(SanPhamChuanHoa)
        .filter(
            SanPhamChuanHoa.maSPCH
            == theo_doi.maSPCH
        )
        .first()
    )

    if not tai_khoan or not san_pham:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Dữ liệu theo dõi không còn liên kết hợp lệ "
                "với tài khoản hoặc sản phẩm"
            ),
        )

    return tai_khoan, san_pham


@router.get("")
def lay_danh_sach_theo_doi_gia(
    tuKhoa: str = Query(
        default="",
        max_length=255,
    ),
    trangThai: str = Query(default="all"),
    thongBao: str = Query(default="all"),
    trang: int = Query(default=1, ge=1),
    kichThuocTrang: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    truy_van = (
        db.query(
            TheoDoiGia,
            TaiKhoan,
            SanPhamChuanHoa,
        )
        .join(
            TaiKhoan,
            TheoDoiGia.maTaiKhoan
            == TaiKhoan.maTaiKhoan,
        )
        .join(
            SanPhamChuanHoa,
            TheoDoiGia.maSPCH
            == SanPhamChuanHoa.maSPCH,
        )
    )

    tu_khoa = str(tuKhoa or "").strip()

    if tu_khoa:
        mau_tim_kiem = f"%{tu_khoa}%"

        truy_van = truy_van.filter(
            or_(
                TaiKhoan.hoTen.ilike(
                    mau_tim_kiem
                ),
                TaiKhoan.email.ilike(
                    mau_tim_kiem
                ),
                SanPhamChuanHoa.tenChuan.ilike(
                    mau_tim_kiem
                ),
            )
        )

    trang_thai = str(
        trangThai or ""
    ).strip().lower()

    if trang_thai == "active":
        truy_van = truy_van.filter(
            TheoDoiGia.trangThai.is_(True)
        )
    elif trang_thai == "inactive":
        truy_van = truy_van.filter(
            TheoDoiGia.trangThai.is_(False)
        )

    trang_thai_thong_bao = str(
        thongBao or ""
    ).strip().lower()

    if trang_thai_thong_bao == "sent":
        truy_van = truy_van.filter(
            TheoDoiGia.daThongBao.is_(True)
        )
    elif trang_thai_thong_bao == "pending":
        truy_van = truy_van.filter(
            TheoDoiGia.daThongBao.is_(False)
        )

    tong_so_ban_ghi = truy_van.count()
    vi_tri_bat_dau = (
        trang - 1
    ) * kichThuocTrang

    danh_sach = (
        truy_van
        .order_by(
            TheoDoiGia.ngayTheoDoi.desc(),
            TheoDoiGia.maTheoDoi.desc(),
        )
        .offset(vi_tri_bat_dau)
        .limit(kichThuocTrang)
        .all()
    )

    tong_so_trang = (
        tong_so_ban_ghi
        + kichThuocTrang
        - 1
    ) // kichThuocTrang

    items = [
        chuyen_theo_doi_sang_dict(
            theo_doi,
            tai_khoan,
            san_pham,
            db,
        )
        for theo_doi, tai_khoan, san_pham
        in danh_sach
    ]

    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "trangHienTai": trang,
                "kichThuocTrang": kichThuocTrang,
                "tongSoBanGhi": tong_so_ban_ghi,
                "tongSoTrang": tong_so_trang,
            },
        },
    }


@router.get("/{ma_theo_doi}")
def lay_chi_tiet_theo_doi_gia(
    ma_theo_doi: int,
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    theo_doi = lay_theo_doi_hoac_bao_loi(
        ma_theo_doi,
        db,
    )

    tai_khoan, san_pham = (
        lay_du_lieu_lien_quan(
            theo_doi,
            db,
        )
    )

    return {
        "success": True,
        "data": chuyen_theo_doi_sang_dict(
            theo_doi,
            tai_khoan,
            san_pham,
            db,
        ),
    }


@router.patch("/{ma_theo_doi}/status")
def cap_nhat_trang_thai_theo_doi(
    ma_theo_doi: int,
    request: CapNhatTrangThaiTheoDoiRequest,
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    theo_doi = lay_theo_doi_hoac_bao_loi(
        ma_theo_doi,
        db,
    )

    theo_doi.trangThai = request.trangThai
    theo_doi.ngayCapNhat = utc_now_naive()

    db.commit()
    db.refresh(theo_doi)

    tai_khoan, san_pham = (
        lay_du_lieu_lien_quan(
            theo_doi,
            db,
        )
    )

    return {
        "success": True,
        "message": (
            "Đã bật lại theo dõi giá"
            if request.trangThai
            else "Đã tạm dừng theo dõi giá"
        ),
        "data": chuyen_theo_doi_sang_dict(
            theo_doi,
            tai_khoan,
            san_pham,
            db,
        ),
    }


@router.delete("/{ma_theo_doi}")
def xoa_theo_doi_gia(
    ma_theo_doi: int,
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    theo_doi = lay_theo_doi_hoac_bao_loi(
        ma_theo_doi,
        db,
    )

    db.delete(theo_doi)
    db.commit()

    return {
        "success": True,
        "message": "Đã xóa yêu cầu theo dõi giá",
    }

