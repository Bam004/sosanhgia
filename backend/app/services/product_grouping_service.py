from sqlalchemy.orm import Session

from backend.app.models import SanPhamChuanHoa, SanPhamTho
from backend.app.services.text_matching_service import TextMatchingService


def raw_item_to_matching_dict(item: SanPhamTho) -> dict:
    return {
        "maSPTho": item.maSPTho,
        "maSPCH": item.maSPCH,
        "tenSanPham": item.tenSanPham,
        "sanTMDT": item.sanTMDT,
        "giaHienTai": float(item.giaHienTai) if item.giaHienTai is not None else None,
        "linkGoc": item.linkGoc,
        "hinhAnh": item.hinhAnh,
        "danhGia": item.danhGia,
        "soLuongDanhGia": item.soLuongDanhGia,
        "attributes": item.attributes,
    }


def determine_standardized_status(total_sources: int, need_review: bool = False) -> str:
    if need_review:
        return "CAN_KIEM_TRA"

    if total_sources >= 2:
        return "DU_NGUON"

    return "CHUA_DU_NGUON"


def refresh_standardized_product_summary(
    db: Session,
    standardized_product: SanPhamChuanHoa,
) -> None:
    items = (
        db.query(SanPhamTho)
        .filter(SanPhamTho.maSPCH == standardized_product.maSPCH)
        .all()
    )

    prices = [
        item.giaHienTai
        for item in items
        if item.giaHienTai is not None
    ]

    sources = {
        item.sanTMDT
        for item in items
        if item.sanTMDT
    }

    representative_item = next(
        (item for item in items if item.hinhAnh),
        items[0] if items else None,
    )

    standardized_product.soSanPhamTho = len(items)
    standardized_product.soNguonBan = len(sources)
    standardized_product.giaThapNhat = min(prices) if prices else None
    standardized_product.giaCaoNhat = max(prices) if prices else None
    standardized_product.trangThai = determine_standardized_status(
        total_sources=len(sources),
        need_review=standardized_product.canKiemTra,
    )

    if representative_item and not standardized_product.hinhAnhChinh:
        standardized_product.hinhAnhChinh = representative_item.hinhAnh


def auto_group_ungrouped_products(
    db: Session,
    commit: bool = True,
) -> dict:
    ungrouped_items = (
        db.query(SanPhamTho)
        .filter(SanPhamTho.maSPCH.is_(None))
        .order_by(SanPhamTho.maSPTho.asc())
        .all()
    )

    if not ungrouped_items:
        return {
            "success": True,
            "message": "Không có sản phẩm thô nào cần gom nhóm",
            "created_groups": 0,
            "linked_items": 0,
            "review_items": 0,
            "total_ungrouped_items": 0,
        }

    text_matching_service = TextMatchingService()

    matching_items = [
        raw_item_to_matching_dict(item)
        for item in ungrouped_items
    ]

    groups = text_matching_service.group_products(matching_items)

    created_groups = 0
    linked_items = 0
    review_items = 0

    try:
        for group in groups:
            group_items = group.get("items", [])

            if not group_items:
                continue

            need_review = False
            representative_item = group.get("sanPhamGiaThapNhat") or group_items[0]

            standardized_product = SanPhamChuanHoa(
                tenChuan=group.get("tenChuanHoa") or representative_item.get("tenSanPham"),
                loai=group.get("productType"),
                thuongHieu=group.get("thuongHieu"),
                hinhAnhChinh=representative_item.get("hinhAnh"),
                giaThapNhat=group.get("giaThapNhat"),
                giaCaoNhat=group.get("giaCaoNhat"),
                soSanPhamTho=group.get("soSanPham", len(group_items)),
                soNguonBan=group.get("soNguon", 0),
                trangThai=determine_standardized_status(
                    total_sources=group.get("soNguon", 0),
                    need_review=need_review,
                ),
                canKiemTra=need_review,
                moTa=None,
            )

            db.add(standardized_product)
            db.flush()

            created_groups += 1

            item_ids = [
                item.get("maSPTho")
                for item in group_items
                if item.get("maSPTho") is not None
            ]

            if item_ids:
                updated_count = (
                    db.query(SanPhamTho)
                    .filter(SanPhamTho.maSPTho.in_(item_ids))
                    .update(
                        {SanPhamTho.maSPCH: standardized_product.maSPCH},
                        synchronize_session=False,
                    )
                )

                linked_items += updated_count

            if need_review:
                review_items += len(group_items)

            refresh_standardized_product_summary(db, standardized_product)

        if commit:
            db.commit()

        return {
            "success": True,
            "message": "Tự động tạo nhóm sản phẩm chuẩn hóa hoàn tất",
            "created_groups": created_groups,
            "linked_items": linked_items,
            "review_items": review_items,
            "total_ungrouped_items": len(ungrouped_items),
        }

    except Exception:
        if commit:
            db.rollback()
        raise
