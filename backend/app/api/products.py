from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import SanPhamTho, LichSuGia, SanPhamChuanHoa
from backend.app.services.text_matching_service import TextMatchingService


router = APIRouter(
    prefix="/api/products",
    tags=["So sanh gia"]
)


def item_to_response(
    item: SanPhamTho,
    tinh_trang: str | None = None
) -> dict:
    return {
        "maSPTho": item.maSPTho,
        "maSPCH": item.maSPCH,
        "tenSanPham": item.tenSanPham,
        "sanTMDT": item.sanTMDT,
        "giaHienTai": float(item.giaHienTai) if item.giaHienTai else None,
        "linkGoc": item.linkGoc,
        "hinhAnh": item.hinhAnh,
        "danhGia": item.danhGia,
        "soLuongDanhGia": item.soLuongDanhGia,
        "ngayCapNhat": item.ngayCapNhat.isoformat() if item.ngayCapNhat else None,
        "tinhTrang": tinh_trang,
    }


def standardized_product_to_response(spch: SanPhamChuanHoa) -> dict:
    return {
        "maSPCH": spch.maSPCH,
        "tenChuanHoa": spch.tenChuanHoa,
        "thuongHieu": spch.thuongHieu,
        "dungLuong": spch.dungLuong,
        "modelKey": spch.modelKey,
        "productType": spch.productType,
        "tinhTrang": spch.tinhTrang,
        "anhDaiDien": spch.anhDaiDien,
        "ngayCapNhat": spch.ngayCapNhat.isoformat() if spch.ngayCapNhat else None,
    }


def filter_items_for_standard_product(
    spch: SanPhamChuanHoa,
    items: list[SanPhamTho]
) -> list[SanPhamTho]:
    """Lọc lại item trong nhóm chuẩn hóa để tránh lẫn phụ kiện/sửa chữa/hàng cũ-hàng mới.

    Search page và compare/detail phải dùng cùng nguyên tắc:
    - phone new không được lẫn phone used/activated/refurbished
    - phone used chỉ lấy used
    - điện thoại không được lẫn phụ kiện hoặc dịch vụ sửa chữa
    """
    from backend.app.api.search import is_accessory, is_repair_service

    matching_service = TextMatchingService()

    expected_product_type = spch.productType
    expected_condition = spch.tinhTrang or "new"

    filtered_items = []

    for item in items:
        item_name = item.tenSanPham or ""

        if expected_product_type == "phone":
            if is_accessory(item_name) or is_repair_service(item_name):
                continue

            normalized_item_name = matching_service._normalize_text(item_name)
            item_condition = matching_service._detect_condition(normalized_item_name)

            if item_condition != expected_condition:
                continue

        elif expected_product_type == "accessory":
            if not is_accessory(item_name):
                continue

        elif expected_product_type == "repair_service":
            if not is_repair_service(item_name):
                continue

        filtered_items.append(item)

    return filtered_items


def sort_items_by_price(items: list[SanPhamTho]) -> list[SanPhamTho]:
    return sorted(
        items,
        key=lambda item: (
            float(item.giaHienTai)
            if item.giaHienTai and item.giaHienTai > 0
            else float("inf")
        )
    )


@router.get("/compare/{product_id}")
def compare_product_prices(
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        spch = (
            db.query(SanPhamChuanHoa)
            .filter(SanPhamChuanHoa.maSPCH == product_id)
            .first()
        )

        if not spch:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Standardized product not found"
                }
            )

        items = (
            db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH == product_id)
            .all()
        )

        items = filter_items_for_standard_product(spch, items)

        if len(items) == 0:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Product not found or all items filtered out"
                }
            )

        items = sort_items_by_price(items)

        prices = [
            float(item.giaHienTai)
            for item in items
            if item.giaHienTai is not None and item.giaHienTai > 0
        ]

        return {
            "success": True,
            "data": {
                "standardized_product_id": product_id,
                "standardized_product": standardized_product_to_response(spch),
                "total_merchants": len(items),
                "lowest_price": min(prices) if prices else None,
                "highest_price": max(prices) if prices else None,
                "items": [
                    item_to_response(item, spch.tinhTrang)
                    for item in items
                ]
            }
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )


@router.get("/{product_id}/history")
def get_product_price_history(
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        spch = (
            db.query(SanPhamChuanHoa)
            .filter(SanPhamChuanHoa.maSPCH == product_id)
            .first()
        )

        if not spch:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Standardized product not found"
                }
            )

        items = (
            db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH == product_id)
            .all()
        )

        items = filter_items_for_standard_product(spch, items)

        if not items:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Product not found or all items filtered out"
                }
            )

        history_data = []

        for item in items:
            history_records = (
                db.query(LichSuGia)
                .filter(LichSuGia.maSPTho == item.maSPTho)
                .order_by(LichSuGia.ngayGhiNhan.asc())
                .all()
            )

            if history_records:
                history_data.append({
                    "maSPTho": item.maSPTho,
                    "maSPCH": item.maSPCH,
                    "sanTMDT": item.sanTMDT,
                    "tenSanPham": item.tenSanPham,
                    "tinhTrang": spch.tinhTrang,
                    "history": [
                        {
                            "gia": float(record.gia),
                            "ngayGhiNhan": record.ngayGhiNhan.isoformat()
                        }
                        for record in history_records
                    ]
                })

        return {
            "success": True,
            "data": history_data
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )
