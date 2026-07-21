# -*- coding: utf-8 -*-

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.api.auth import require_admin
from backend.app.core.database import get_db
from backend.app.core.datetime_utils import utc_now_naive
from backend.app.models import EmailNotificationLog, TaiKhoan
from backend.app.services.email_service import send_price_alert_email


router = APIRouter(
    prefix="/api/admin/email-logs",
    tags=["Admin - Email Logs"],
)


def dinh_dang_ngay(gia_tri):
    return gia_tri.isoformat() if gia_tri else None


def chuyen_nhat_ky_sang_dict(
    nhat_ky: EmailNotificationLog,
) -> dict:
    return {
        "maNhatKyEmail": nhat_ky.maNhatKyEmail,
        "maTheoDoi": nhat_ky.maTheoDoi,
        "maTaiKhoan": nhat_ky.maTaiKhoan,
        "emailNhan": nhat_ky.emailNhan,
        "tenNguoiNhan": nhat_ky.tenNguoiNhan,
        "tieuDe": nhat_ky.tieuDe,
        "loaiThongBao": nhat_ky.loaiThongBao,
        "tenSanPham": nhat_ky.tenSanPham,
        "giaMucTieu": (
            float(nhat_ky.giaMucTieu)
            if nhat_ky.giaMucTieu is not None
            else None
        ),
        "giaHienTai": (
            float(nhat_ky.giaHienTai)
            if nhat_ky.giaHienTai is not None
            else None
        ),
        "nguonGia": nhat_ky.nguonGia,
        "linkSanPham": nhat_ky.linkSanPham,
        "linkGoc": nhat_ky.linkGoc,
        "trangThai": nhat_ky.trangThai,
        "soLanThu": nhat_ky.soLanThu,
        "loiGanNhat": nhat_ky.loiGanNhat,
        "ngayTao": dinh_dang_ngay(
            nhat_ky.ngayTao
        ),
        "ngayGui": dinh_dang_ngay(
            nhat_ky.ngayGui
        ),
        "ngayCapNhat": dinh_dang_ngay(
            nhat_ky.ngayCapNhat
        ),
    }


def lay_nhat_ky_hoac_bao_loi(
    ma_nhat_ky_email: int,
    db: Session,
) -> EmailNotificationLog:
    nhat_ky = (
        db.query(EmailNotificationLog)
        .filter(
            EmailNotificationLog.maNhatKyEmail
            == ma_nhat_ky_email
        )
        .first()
    )

    if not nhat_ky:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy nhật ký email",
        )

    return nhat_ky


def doc_ket_qua_gui_email(ket_qua):
    if isinstance(ket_qua, dict):
        return (
            bool(ket_qua.get("success")),
            ket_qua.get("error"),
        )

    return bool(ket_qua), None


def dem_so_lan_thu(
    db: Session,
    nhat_ky_goc: EmailNotificationLog,
) -> int:
    truy_van = db.query(
        func.max(
            EmailNotificationLog.soLanThu
        )
    )

    if nhat_ky_goc.maTheoDoi is not None:
        truy_van = truy_van.filter(
            EmailNotificationLog.maTheoDoi
            == nhat_ky_goc.maTheoDoi
        )
    else:
        truy_van = truy_van.filter(
            EmailNotificationLog.emailNhan
            == nhat_ky_goc.emailNhan,
            EmailNotificationLog.tenSanPham
            == nhat_ky_goc.tenSanPham,
        )

    so_lan_lon_nhat = truy_van.scalar() or 0

    return int(so_lan_lon_nhat) + 1


def tao_nhat_ky_gui_lai(
    db: Session,
    nhat_ky_goc: EmailNotificationLog,
) -> EmailNotificationLog:
    nhat_ky_moi = EmailNotificationLog(
        maTheoDoi=nhat_ky_goc.maTheoDoi,
        maTaiKhoan=nhat_ky_goc.maTaiKhoan,
        emailNhan=nhat_ky_goc.emailNhan,
        tenNguoiNhan=nhat_ky_goc.tenNguoiNhan,
        tieuDe=nhat_ky_goc.tieuDe,
        loaiThongBao=nhat_ky_goc.loaiThongBao,
        tenSanPham=nhat_ky_goc.tenSanPham,
        giaMucTieu=nhat_ky_goc.giaMucTieu,
        giaHienTai=nhat_ky_goc.giaHienTai,
        nguonGia=nhat_ky_goc.nguonGia,
        linkSanPham=nhat_ky_goc.linkSanPham,
        linkGoc=nhat_ky_goc.linkGoc,
        trangThai="pending",
        soLanThu=dem_so_lan_thu(
            db,
            nhat_ky_goc,
        ),
        loiGanNhat=None,
    )

    db.add(nhat_ky_moi)
    db.commit()
    db.refresh(nhat_ky_moi)

    return nhat_ky_moi


@router.get("")
def lay_danh_sach_nhat_ky_email(
    tuKhoa: str = Query(
        default="",
        max_length=255,
    ),
    trangThai: str = Query(default="all"),
    trang: int = Query(default=1, ge=1),
    kichThuocTrang: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    truy_van = db.query(
        EmailNotificationLog
    )

    tu_khoa = str(
        tuKhoa or ""
    ).strip()

    if tu_khoa:
        mau_tim_kiem = f"%{tu_khoa}%"

        truy_van = truy_van.filter(
            or_(
                EmailNotificationLog.emailNhan.ilike(
                    mau_tim_kiem
                ),
                EmailNotificationLog.tenNguoiNhan.ilike(
                    mau_tim_kiem
                ),
                EmailNotificationLog.tenSanPham.ilike(
                    mau_tim_kiem
                ),
                EmailNotificationLog.tieuDe.ilike(
                    mau_tim_kiem
                ),
                EmailNotificationLog.nguonGia.ilike(
                    mau_tim_kiem
                ),
            )
        )

    trang_thai = str(
        trangThai or ""
    ).strip().lower()

    if trang_thai in {
        "pending",
        "sent",
        "failed",
    }:
        truy_van = truy_van.filter(
            EmailNotificationLog.trangThai
            == trang_thai
        )

    tong_so_ban_ghi = truy_van.count()

    vi_tri_bat_dau = (
        trang - 1
    ) * kichThuocTrang

    danh_sach = (
        truy_van
        .order_by(
            EmailNotificationLog.ngayTao.desc(),
            EmailNotificationLog.maNhatKyEmail.desc(),
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

    thong_ke = {
        "tongSo": db.query(
            EmailNotificationLog
        ).count(),
        "daGui": (
            db.query(EmailNotificationLog)
            .filter(
                EmailNotificationLog.trangThai
                == "sent"
            )
            .count()
        ),
        "thatBai": (
            db.query(EmailNotificationLog)
            .filter(
                EmailNotificationLog.trangThai
                == "failed"
            )
            .count()
        ),
        "dangCho": (
            db.query(EmailNotificationLog)
            .filter(
                EmailNotificationLog.trangThai
                == "pending"
            )
            .count()
        ),
    }

    return {
        "success": True,
        "data": {
            "items": [
                chuyen_nhat_ky_sang_dict(
                    nhat_ky
                )
                for nhat_ky in danh_sach
            ],
            "statistics": thong_ke,
            "pagination": {
                "trangHienTai": trang,
                "kichThuocTrang": kichThuocTrang,
                "tongSoBanGhi": tong_so_ban_ghi,
                "tongSoTrang": tong_so_trang,
            },
        },
    }


@router.get("/{ma_nhat_ky_email}")
def lay_chi_tiet_nhat_ky_email(
    ma_nhat_ky_email: int,
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    nhat_ky = lay_nhat_ky_hoac_bao_loi(
        ma_nhat_ky_email,
        db,
    )

    return {
        "success": True,
        "data": chuyen_nhat_ky_sang_dict(
            nhat_ky
        ),
    }


@router.post("/{ma_nhat_ky_email}/retry")
def gui_lai_email_that_bai(
    ma_nhat_ky_email: int,
    db: Session = Depends(get_db),
    _: TaiKhoan = Depends(require_admin),
):
    nhat_ky_goc = lay_nhat_ky_hoac_bao_loi(
        ma_nhat_ky_email,
        db,
    )

    if nhat_ky_goc.trangThai != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Chỉ có thể gửi lại email "
                "đang ở trạng thái thất bại"
            ),
        )

    if not nhat_ky_goc.emailNhan:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nhật ký không còn địa chỉ email người nhận",
        )

    if (
        nhat_ky_goc.giaMucTieu is None
        or nhat_ky_goc.giaHienTai is None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Nhật ký không đủ dữ liệu giá "
                "để gửi lại email"
            ),
        )

    try:
        nhat_ky_moi = tao_nhat_ky_gui_lai(
            db,
            nhat_ky_goc,
        )
    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo lần gửi email mới",
        )

    ket_qua_gui = send_price_alert_email(
        to_email=nhat_ky_moi.emailNhan,
        user_name=nhat_ky_moi.tenNguoiNhan,
        product_name=(
            nhat_ky_moi.tenSanPham
            or "Sản phẩm đang theo dõi"
        ),
        target_price=float(
            nhat_ky_moi.giaMucTieu
        ),
        current_price=float(
            nhat_ky_moi.giaHienTai
        ),
        source_name=(
            nhat_ky_moi.nguonGia
            or "Không xác định"
        ),
        product_link=(
            nhat_ky_moi.linkSanPham
            or ""
        ),
        original_link=(
            nhat_ky_moi.linkGoc
            or ""
        ),
        return_details=True,
    )

    thanh_cong, noi_dung_loi = (
        doc_ket_qua_gui_email(
            ket_qua_gui
        )
    )

    thoi_gian_hien_tai = utc_now_naive()

    if thanh_cong:
        nhat_ky_moi.trangThai = "sent"
        nhat_ky_moi.ngayGui = thoi_gian_hien_tai
        nhat_ky_moi.loiGanNhat = None
    else:
        nhat_ky_moi.trangThai = "failed"
        nhat_ky_moi.ngayGui = None
        nhat_ky_moi.loiGanNhat = (
            noi_dung_loi
            or "Không gửi được email."
        )

    nhat_ky_moi.ngayCapNhat = (
        thoi_gian_hien_tai
    )

    try:
        db.commit()
        db.refresh(nhat_ky_moi)
    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Đã thử gửi email nhưng không thể "
                "lưu kết quả vào nhật ký"
            ),
        )

    if not thanh_cong:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Gửi lại email không thành công",
                "emailLog": chuyen_nhat_ky_sang_dict(
                    nhat_ky_moi
                ),
            },
        )

    return {
        "success": True,
        "message": "Đã gửi lại email thành công",
        "data": chuyen_nhat_ky_sang_dict(
            nhat_ky_moi
        ),
    }

