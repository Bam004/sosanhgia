from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.app.models.lich_su_gia import LichSuGia
from backend.app.models.san_pham_tho import SanPhamTho


def chuyen_gia_ve_decimal(gia: Any) -> Decimal:
    if gia is None:
        raise ValueError("Giá sản phẩm không được để trống")

    if isinstance(gia, Decimal):
        return gia

    gia_text = str(gia)
    gia_text = gia_text.replace("₫", "")
    gia_text = gia_text.replace("VNĐ", "")
    gia_text = gia_text.replace("VND", "")
    gia_text = gia_text.replace("vnd", "")
    gia_text = gia_text.replace(".", "")
    gia_text = gia_text.replace(",", "")
    gia_text = gia_text.strip()

    if not gia_text:
        raise ValueError("Giá sản phẩm không hợp lệ")

    try:
        return Decimal(gia_text)
    except InvalidOperation as exc:
        raise ValueError(f"Không thể chuyển giá sang số: {gia}") from exc


def lay_gia_tu_du_lieu(du_lieu: Dict[str, Any]) -> Decimal:
    return chuyen_gia_ve_decimal(
        du_lieu.get("giaHienTai")
        or du_lieu.get("gia")
        or du_lieu.get("current_price")
    )


def tim_san_pham_tho_da_co(db: Session, san_tmdt: str, link_goc: str) -> Optional[SanPhamTho]:
    return (
        db.query(SanPhamTho)
        .filter(
            SanPhamTho.sanTMDT == san_tmdt,
            SanPhamTho.linkGoc == link_goc,
        )
        .first()
    )


def da_co_lich_su_gia(db: Session, ma_sp_tho: int) -> bool:
    return (
        db.query(LichSuGia)
        .filter(LichSuGia.maSPTho == ma_sp_tho)
        .first()
        is not None
    )


def them_lich_su_gia(
    db: Session,
    ma_sp_tho: int,
    gia: Decimal,
    ngay_ghi_nhan: Optional[datetime] = None,
) -> LichSuGia:
    lich_su = LichSuGia(
        maSPTho=ma_sp_tho,
        gia=gia,
        ngayGhiNhan=ngay_ghi_nhan or datetime.utcnow(),
    )
    db.add(lich_su)
    return lich_su


def cap_nhat_san_pham_tho_va_lich_su_gia(
    db: Session,
    du_lieu: Dict[str, Any],
    commit: bool = True,
) -> Dict[str, Any]:
    """
    Nhận dữ liệu sản phẩm từ spider, sau đó:
    - Thêm sản phẩm thô nếu chưa tồn tại.
    - Cập nhật giá nếu sản phẩm đã tồn tại.
    - Ghi lịch sử giá khi sản phẩm mới hoặc giá thay đổi.
    """

    ten_san_pham = du_lieu.get("tenSanPham") or du_lieu.get("ten_san_pham") or du_lieu.get("title")
    san_tmdt = du_lieu.get("sanTMDT") or du_lieu.get("san_tmdt") or du_lieu.get("merchant_name")
    link_goc = du_lieu.get("linkGoc") or du_lieu.get("link_goc") or du_lieu.get("origin_url")
    gia_moi = lay_gia_tu_du_lieu(du_lieu)

    if not ten_san_pham:
        raise ValueError("Thiếu tên sản phẩm")

    if not san_tmdt:
        raise ValueError("Thiếu tên nguồn/sàn TMĐT")

    if not link_goc:
        raise ValueError("Thiếu link gốc sản phẩm")

    thoi_diem_hien_tai = datetime.utcnow()

    try:
        san_pham = tim_san_pham_tho_da_co(db, san_tmdt, link_goc)

        if san_pham is None:
            san_pham = SanPhamTho(
                maSPCH=du_lieu.get("maSPCH"),
                tenSanPham=ten_san_pham,
                sanTMDT=san_tmdt,
                giaHienTai=gia_moi,
                linkGoc=link_goc,
                hinhAnh=du_lieu.get("hinhAnh") or du_lieu.get("hinh_anh") or du_lieu.get("image_url"),
                danhGia=du_lieu.get("danhGia") or du_lieu.get("danh_gia") or du_lieu.get("rating"),
                soLuongDanhGia=du_lieu.get("soLuongDanhGia") or du_lieu.get("so_luong_danh_gia") or 0,
                attributes=du_lieu.get("attributes") or {},
                ngayCapNhat=thoi_diem_hien_tai,
            )

            db.add(san_pham)
            db.flush()

            them_lich_su_gia(db, san_pham.maSPTho, gia_moi, thoi_diem_hien_tai)

            hanh_dong = "TAO_MOI_SAN_PHAM_VA_GHI_LICH_SU"
            gia_cu = None

        else:
            gia_cu = Decimal(san_pham.giaHienTai)

            if not da_co_lich_su_gia(db, san_pham.maSPTho):
                them_lich_su_gia(
                    db,
                    san_pham.maSPTho,
                    gia_cu,
                    san_pham.ngayCapNhat or thoi_diem_hien_tai,
                )

            san_pham.tenSanPham = ten_san_pham
            san_pham.giaHienTai = gia_moi
            san_pham.hinhAnh = du_lieu.get("hinhAnh") or du_lieu.get("hinh_anh") or du_lieu.get("image_url") or san_pham.hinhAnh
            san_pham.danhGia = du_lieu.get("danhGia") or du_lieu.get("danh_gia") or du_lieu.get("rating") or san_pham.danhGia
            san_pham.soLuongDanhGia = du_lieu.get("soLuongDanhGia") or du_lieu.get("so_luong_danh_gia") or san_pham.soLuongDanhGia
            san_pham.attributes = du_lieu.get("attributes") or san_pham.attributes
            san_pham.ngayCapNhat = thoi_diem_hien_tai

            if gia_cu != gia_moi:
                them_lich_su_gia(db, san_pham.maSPTho, gia_moi, thoi_diem_hien_tai)
                hanh_dong = "CAP_NHAT_GIA_VA_GHI_LICH_SU"
            else:
                hanh_dong = "CAP_NHAT_THONG_TIN_KHONG_DOI_GIA"

        if commit:
            db.commit()
            db.refresh(san_pham)

        return {
            "success": True,
            "hanhDong": hanh_dong,
            "maSPTho": san_pham.maSPTho,
            "tenSanPham": san_pham.tenSanPham,
            "sanTMDT": san_pham.sanTMDT,
            "giaCu": float(gia_cu) if gia_cu is not None else None,
            "giaMoi": float(gia_moi),
        }

    except Exception:
        if commit:
            db.rollback()
        raise
