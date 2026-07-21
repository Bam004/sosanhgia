import logging

from sqlalchemy.orm import Session

from backend.app.api.products import (
    filter_items_for_standard_product,
    sort_items_by_price,
)
from backend.app.core.config import settings
from backend.app.core.datetime_utils import utc_now_naive
from backend.app.models import (
    EmailNotificationLog,
    SanPhamChuanHoa,
    SanPhamTho,
    TaiKhoan,
    TheoDoiGia,
)
from backend.app.services.email_service import send_price_alert_email
from backend.app.utils.source_normalization import normalize_source_code


logger = logging.getLogger(__name__)

TIEU_DE_EMAIL_GIAM_GIA = (
    "Sản phẩm đã đạt mức giá bạn mong muốn"
)


def get_current_lowest_offer(
    maSPCH: int,
    db: Session,
):
    spch = (
        db.query(SanPhamChuanHoa)
        .filter(
            SanPhamChuanHoa.maSPCH == maSPCH
        )
        .first()
    )

    if not spch:
        return None

    items = (
        db.query(SanPhamTho)
        .filter(
            SanPhamTho.maSPCH == maSPCH
        )
        .all()
    )

    items = filter_items_for_standard_product(
        spch,
        items,
    )

    valid_items = []

    for item in items:
        if (
            item.giaHienTai
            and float(item.giaHienTai) > 0
        ):
            valid_items.append(item)

    sorted_items = sort_items_by_price(valid_items)

    if not sorted_items:
        return None

    lowest_item = sorted_items[0]

    _, source_name = normalize_source_code(
        lowest_item.sanTMDT or ""
    )

    return {
        "giaThapNhat": float(
            lowest_item.giaHienTai
        ),
        "sourceName": source_name,
        "linkGoc": lowest_item.linkGoc,
        "tenSanPham": lowest_item.tenSanPham,
    }


def _doc_ket_qua_gui_email(
    ket_qua,
):
    if isinstance(ket_qua, dict):
        return (
            bool(ket_qua.get("success")),
            ket_qua.get("error"),
        )

    return bool(ket_qua), None


def _dem_so_lan_thu_gui(
    db: Session,
    ma_theo_doi: int,
) -> int:
    so_lan_da_thu = (
        db.query(EmailNotificationLog)
        .filter(
            EmailNotificationLog.maTheoDoi
            == ma_theo_doi
        )
        .count()
    )

    return so_lan_da_thu + 1


def _tao_nhat_ky_email(
    db: Session,
    alert: TheoDoiGia,
    user: TaiKhoan,
    spch: SanPhamChuanHoa,
    gia_mong_muon: float,
    gia_hien_tai: float,
    offer: dict,
    product_link: str,
) -> EmailNotificationLog:
    nhat_ky = EmailNotificationLog(
        maTheoDoi=alert.maTheoDoi,
        maTaiKhoan=user.maTaiKhoan,
        emailNhan=user.email,
        tenNguoiNhan=user.hoTen,
        tieuDe=TIEU_DE_EMAIL_GIAM_GIA,
        loaiThongBao="price_alert",
        tenSanPham=spch.tenChuan,
        giaMucTieu=gia_mong_muon,
        giaHienTai=gia_hien_tai,
        nguonGia=offer["sourceName"],
        linkSanPham=product_link,
        linkGoc=offer["linkGoc"],
        trangThai="pending",
        soLanThu=_dem_so_lan_thu_gui(
            db,
            alert.maTheoDoi,
        ),
        loiGanNhat=None,
    )

    db.add(nhat_ky)
    db.commit()
    db.refresh(nhat_ky)

    return nhat_ky


def check_price_alerts(
    db: Session,
):
    stats = {
        "checked": 0,
        "skipped_missing_target": 0,
        "skipped_no_offer": 0,
        "not_reached": 0,
        "notified": 0,
        "email_failed": 0,
    }

    active_alerts = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.trangThai.is_(True),
            TheoDoiGia.daThongBao.is_(False),
        )
        .all()
    )

    for alert in active_alerts:
        stats["checked"] += 1

        if (
            alert.giaMongMuon is None
            or alert.giaMongMuon <= 0
        ):
            stats["skipped_missing_target"] += 1
            continue

        offer = get_current_lowest_offer(
            alert.maSPCH,
            db,
        )

        if not offer:
            stats["skipped_no_offer"] += 1
            continue

        gia_hien_tai = offer["giaThapNhat"]
        gia_mong_muon = float(
            alert.giaMongMuon
        )

        if gia_hien_tai > gia_mong_muon:
            stats["not_reached"] += 1
            continue

        user = (
            db.query(TaiKhoan)
            .filter(
                TaiKhoan.maTaiKhoan
                == alert.maTaiKhoan
            )
            .first()
        )

        spch = (
            db.query(SanPhamChuanHoa)
            .filter(
                SanPhamChuanHoa.maSPCH
                == alert.maSPCH
            )
            .first()
        )

        if not user or not spch:
            logger.warning(
                "Không tìm thấy tài khoản hoặc "
                "sản phẩm cho maTheoDoi %s.",
                alert.maTheoDoi,
            )
            continue

        product_link = (
            f"{settings.FRONTEND_URL}"
            f"/san-pham/{alert.maSPCH}"
        )

        try:
            nhat_ky = _tao_nhat_ky_email(
                db=db,
                alert=alert,
                user=user,
                spch=spch,
                gia_mong_muon=gia_mong_muon,
                gia_hien_tai=gia_hien_tai,
                offer=offer,
                product_link=product_link,
            )
        except Exception:
            db.rollback()

            logger.exception(
                "Không thể tạo nhật ký email "
                "cho maTheoDoi %s.",
                alert.maTheoDoi,
            )

            stats["email_failed"] += 1
            continue

        ket_qua_gui = send_price_alert_email(
            to_email=user.email,
            user_name=user.hoTen,
            product_name=spch.tenChuan,
            target_price=gia_mong_muon,
            current_price=gia_hien_tai,
            source_name=offer["sourceName"],
            product_link=product_link,
            original_link=offer["linkGoc"],
            return_details=True,
        )

        thanh_cong, noi_dung_loi = (
            _doc_ket_qua_gui_email(
                ket_qua_gui
            )
        )

        if thanh_cong:
            thoi_gian_gui = utc_now_naive()

            alert.daThongBao = True
            alert.ngayThongBao = thoi_gian_gui
            alert.giaLucThongBao = gia_hien_tai

            nhat_ky.trangThai = "sent"
            nhat_ky.ngayGui = thoi_gian_gui
            nhat_ky.loiGanNhat = None
            nhat_ky.ngayCapNhat = thoi_gian_gui

            try:
                db.commit()
                stats["notified"] += 1
            except Exception:
                db.rollback()

                logger.exception(
                    "Lỗi cập nhật trạng thái "
                    "thông báo cho maTheoDoi %s.",
                    alert.maTheoDoi,
                )

                stats["email_failed"] += 1

            continue

        nhat_ky.trangThai = "failed"
        nhat_ky.loiGanNhat = (
            noi_dung_loi
            or "Không gửi được email."
        )
        nhat_ky.ngayCapNhat = utc_now_naive()

        try:
            db.commit()
        except Exception:
            db.rollback()

            logger.exception(
                "Không thể lưu trạng thái email lỗi "
                "cho maTheoDoi %s.",
                alert.maTheoDoi,
            )

        stats["email_failed"] += 1

    return stats

