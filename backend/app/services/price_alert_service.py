import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models import TheoDoiGia, SanPhamChuanHoa, SanPhamTho, TaiKhoan
from backend.app.services.email_service import send_price_alert_email
from backend.app.core.config import settings
from backend.app.api.products import filter_items_for_standard_product, sort_items_by_price
from backend.app.utils.source_normalization import normalize_source_code

from backend.app.core.datetime_utils import utc_now_naive
logger = logging.getLogger(__name__)

def get_current_lowest_offer(maSPCH: int, db: Session):
    spch = db.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.maSPCH == maSPCH).first()
    if not spch:
        return None

    items = db.query(SanPhamTho).filter(SanPhamTho.maSPCH == maSPCH).all()
    items = filter_items_for_standard_product(spch, items)

    valid_items = []
    for item in items:
        if item.giaHienTai and float(item.giaHienTai) > 0:
            valid_items.append(item)

    sorted_items = sort_items_by_price(valid_items)
    if not sorted_items:
        return None

    lowest_item = sorted_items[0]
    _, source_name = normalize_source_code(lowest_item.sanTMDT or "")

    return {
        "giaThapNhat": float(lowest_item.giaHienTai),
        "sourceName": source_name,
        "linkGoc": lowest_item.linkGoc,
        "tenSanPham": lowest_item.tenSanPham
    }

def check_price_alerts(db: Session):
    stats = {
        "checked": 0,
        "skipped_missing_target": 0,
        "skipped_no_offer": 0,
        "not_reached": 0,
        "notified": 0,
        "email_failed": 0
    }

    active_alerts = (
        db.query(TheoDoiGia)
        .filter(
            TheoDoiGia.trangThai == True,
            TheoDoiGia.daThongBao == False
        )
        .all()
    )

    for alert in active_alerts:
        stats["checked"] += 1

        if alert.giaMongMuon is None or alert.giaMongMuon <= 0:
            stats["skipped_missing_target"] += 1
            continue

        offer = get_current_lowest_offer(alert.maSPCH, db)
        if not offer:
            stats["skipped_no_offer"] += 1
            continue

        gia_hien_tai = offer["giaThapNhat"]
        gia_mong_muon = float(alert.giaMongMuon)

        if gia_hien_tai <= gia_mong_muon:
            user = db.query(TaiKhoan).filter(TaiKhoan.maTaiKhoan == alert.maTaiKhoan).first()
            spch = db.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.maSPCH == alert.maSPCH).first()

            if not user or not spch:
                continue

            product_link = f"{settings.FRONTEND_URL}/san-pham/{alert.maSPCH}"

            success = send_price_alert_email(
                to_email=user.email,
                user_name=user.hoTen,
                product_name=spch.tenChuan,
                target_price=gia_mong_muon,
                current_price=gia_hien_tai,
                source_name=offer["sourceName"],
                product_link=product_link,
                original_link=offer["linkGoc"]
            )

            if success:
                alert.daThongBao = True
                alert.ngayThongBao = utc_now_naive()
                alert.giaLucThongBao = gia_hien_tai

                try:
                    db.commit()
                    stats["notified"] += 1
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error committing notification status for maTheoDoi {alert.maTheoDoi}: {e}")
            else:
                stats["email_failed"] += 1
        else:
            stats["not_reached"] += 1

    return stats
