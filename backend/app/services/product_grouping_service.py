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
    text_matching_service: TextMatchingService | None = None,
) -> None:
    db.flush()

    items = (
        db.query(SanPhamTho)
        .filter(SanPhamTho.maSPCH == standardized_product.maSPCH)
        .all()
    )

    prices = [
        item.giaHienTai
        for item in items
        if item.giaHienTai is not None
        and item.giaHienTai > 0
    ]

    sources = {
        str(item.sanTMDT).strip().lower()
        for item in items
        if item.sanTMDT and str(item.sanTMDT).strip()
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
        need_review=bool(standardized_product.canKiemTra),
    )

    if representative_item and not standardized_product.hinhAnhChinh:
        standardized_product.hinhAnhChinh = representative_item.hinhAnh

    # Phân loại lại sản phẩm từ tên chuẩn hóa.
    matching_service = text_matching_service or TextMatchingService()

    ten_de_phan_loai = (
        standardized_product.tenChuan
        or (
            representative_item.tenSanPham
            if representative_item
            else ""
        )
    )

    normalized_name = matching_service._normalize_text(
        ten_de_phan_loai
    )

    brand = matching_service._extract_brand(
        normalized_name
    )

    is_accessory = matching_service._is_accessory(
        normalized_name
    )

    product_type = matching_service._classify_product_type(
        normalized_name,
        is_accessory,
    )

    for item in items:
        item_name = item.tenSanPham or ""

        item_normalized_name = matching_service._normalize_text(
            item_name
        )

        item_is_accessory = matching_service._is_accessory(
            item_normalized_name
        )

        item_product_type = matching_service._classify_product_type(
            item_normalized_name,
            item_is_accessory,
        )

        item_attributes = dict(item.attributes or {})
        item_attributes["productType"] = item_product_type
        item.attributes = item_attributes

    standardized_product.productType = product_type
    standardized_product.loai = product_type
    standardized_product.thuongHieu = brand

def refresh_all_standardized_product_summaries(
    db: Session,
    commit: bool = True,
) -> dict:
    standardized_products = (
        db.query(SanPhamChuanHoa)
        .order_by(SanPhamChuanHoa.maSPCH.asc())
        .all()
    )

    text_matching_service = TextMatchingService()

    try:
        for standardized_product in standardized_products:
            refresh_standardized_product_summary(
                db,
                standardized_product,
                text_matching_service=text_matching_service,
            )

        if commit:
            db.commit()
        else:
            db.flush()

        return {
            "success": True,
            "message": "Đã cập nhật dữ liệu tổng hợp sản phẩm chuẩn hóa",
            "updated_groups": len(standardized_products),
        }

    except Exception:
        if commit:
            db.rollback()
        raise

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
        refresh_result = refresh_all_standardized_product_summaries(
            db,
            commit=commit,
        )

        return {
            "success": True,
            "message": (
                "Không có sản phẩm thô mới cần gom nhóm. "
                "Dữ liệu sản phẩm chuẩn hóa đã được cập nhật."
            ),
            "created_groups": 0,
            "linked_items": 0,
            "review_items": 0,
            "total_ungrouped_items": 0,
            "updated_groups": refresh_result["updated_groups"],
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
                productType=group.get("productType"),
                thuongHieu=group.get("thuongHieu"),
                dungLuong=group.get("dungLuong"),
                modelKey=group.get("modelKey"),
                tinhTrang=group.get("tinhTrang", "new"),
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
                items_to_link = (
                    db.query(SanPhamTho)
                    .filter(SanPhamTho.maSPTho.in_(item_ids))
                    .all()
                )

                for raw_item in items_to_link:
                    raw_item.maSPCH = standardized_product.maSPCH

                linked_items += len(items_to_link)

                # Đẩy liên kết mới xuống database trước khi tính giá và số nguồn.
                db.flush()

            if need_review:
                review_items += len(group_items)

            refresh_standardized_product_summary(db, standardized_product)

        refresh_result = refresh_all_standardized_product_summaries(
            db,
            commit=False,
        )

        if commit:
            db.commit()

        return {
            "success": True,
            "message": "Tự động tạo nhóm sản phẩm chuẩn hóa hoàn tất",
            "created_groups": created_groups,
            "linked_items": linked_items,
            "review_items": review_items,
            "total_ungrouped_items": len(ungrouped_items),
            "updated_groups": refresh_result["updated_groups"],
        }

    except Exception:
        if commit:
            db.rollback()
        raise
