from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import LichSuGia, SanPhamChuanHoa, SanPhamTho
from backend.app.schemas import SanPhamChuanHoaResponse, SanPhamThoResponse
from backend.app.services.product_grouping_service import auto_group_ungrouped_products
from backend.app.services.text_matching_service import TextMatchingService


router = APIRouter(
    prefix="/api/products",
    tags=["So sanh gia"],
)


def item_to_response(
    item: SanPhamTho,
    tinh_trang: str | None = None,
) -> dict:
    data = jsonable_encoder(SanPhamThoResponse.model_validate(item))
    data["giaHienTai"] = float(item.giaHienTai) if item.giaHienTai is not None else None
    data["ngayCapNhat"] = item.ngayCapNhat.isoformat() if item.ngayCapNhat else None
    data["tinhTrang"] = tinh_trang
    return data


def standardized_product_to_response(spch: SanPhamChuanHoa) -> dict:
    return {
        "maSPCH": spch.maSPCH,
        "tenChuan": spch.tenChuan,
        "tenChuanHoa": spch.tenChuan,
        "loai": spch.loai,
        "thuongHieu": spch.thuongHieu,
        "dungLuong": spch.dungLuong,
        "modelKey": spch.modelKey,
        "productType": spch.productType,
        "tinhTrang": spch.tinhTrang,
        "hinhAnhChinh": spch.hinhAnhChinh,
        "anhDaiDien": spch.hinhAnhChinh,
        "giaThapNhat": float(spch.giaThapNhat) if spch.giaThapNhat is not None else None,
        "giaCaoNhat": float(spch.giaCaoNhat) if spch.giaCaoNhat is not None else None,
        "soSanPhamTho": spch.soSanPhamTho,
        "soNguonBan": spch.soNguonBan,
        "trangThai": spch.trangThai,
        "canKiemTra": spch.canKiemTra,
        "moTa": spch.moTa,
        "ngayTao": spch.ngayTao.isoformat() if spch.ngayTao else None,
        "ngayCapNhat": spch.ngayCapNhat.isoformat() if spch.ngayCapNhat else None,
    }


def filter_items_for_standard_product(
    spch: SanPhamChuanHoa,
    items: list[SanPhamTho],
) -> list[SanPhamTho]:
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

            item_capacity = matching_service._extract_storage(normalized_item_name)
            if spch.dungLuong and item_capacity and item_capacity != spch.dungLuong:
                continue

            item_brand = matching_service._extract_brand(normalized_item_name)
            item_model_key = matching_service._extract_model_key(
                normalized_item_name,
                normalized_item_name.split(),
                item_brand,
                item_capacity,
            )
            if spch.modelKey and item_model_key and item_model_key != spch.modelKey:
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
        ),
    )


@router.get("/standardized")
def get_standardized_products(db: Session = Depends(get_db)):
    try:
        products = (
            db.query(SanPhamChuanHoa)
            .order_by(SanPhamChuanHoa.maSPCH.desc())
            .all()
        )

        return {
            "success": True,
            "data": [standardized_product_to_response(product) for product in products],
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}",
            },
        )


@router.post("/standardized/auto-group")
def auto_group_standardized_products(db: Session = Depends(get_db)):
    try:
        ket_qua = auto_group_ungrouped_products(db)

        return {
            "success": ket_qua.get("success", True),
            "message": ket_qua.get("message", "Tự động tạo nhóm sản phẩm chuẩn hóa hoàn tất"),
            "data": {
                "created_groups": ket_qua.get("created_groups", 0),
                "linked_items": ket_qua.get("linked_items", 0),
                "review_items": ket_qua.get("review_items", 0),
                "total_ungrouped_items": ket_qua.get("total_ungrouped_items", 0),
            },
        }

    except SQLAlchemyError as error:
        db.rollback()

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}",
            },
        )


@router.get("/compare/{product_id}")
def compare_product_prices(
    product_id: int,
    db: Session = Depends(get_db),
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
                    "error": "Standardized product not found",
                },
            )

        items = (
            db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH == product_id)
            .all()
        )

        items = filter_items_for_standard_product(spch, items)

        valid_items = [
            item
            for item in items
            if item.giaHienTai and float(item.giaHienTai) > 0
        ]

        sorted_items = sort_items_by_price(valid_items)

        if not sorted_items:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "data": {
                        "standardized_product_id": product_id,
                        "total_merchants": 0,
                        "lowest_price": None,
                        "highest_price": None,
                        "items": [],
                        "product": standardized_product_to_response(spch),
                        "summary": {
                            "lowest_price": None,
                            "highest_price": None,
                            "source_count": 0,
                            "offer_count": 0,
                        },
                    },
                },
            )

        lowest_price = float(sorted_items[0].giaHienTai)
        highest_price = float(sorted_items[-1].giaHienTai)

        from backend.app.utils.source_normalization import normalize_source_code

        unique_sources = set()
        for item in sorted_items:
            source_code, _ = normalize_source_code(item.sanTMDT or "")
            if source_code:
                unique_sources.add(source_code)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": {
                    "standardized_product_id": product_id,
                    "total_merchants": len(sorted_items),
                    "lowest_price": lowest_price,
                    "highest_price": highest_price,
                    "items": [
                        item_to_response(item, spch.tinhTrang)
                        for item in sorted_items
                    ],
                    "product": standardized_product_to_response(spch),
                    "summary": {
                        "lowest_price": lowest_price,
                        "highest_price": highest_price,
                        "source_count": len(unique_sources),
                        "offer_count": len(sorted_items),
                    },
                },
            },
        )

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}",
            },
        )


@router.get("/{product_id}/history")
def get_product_price_history(
    product_id: int,
    range: str = Query("all", pattern="^(1m|3m|6m|all)$"),
    db: Session = Depends(get_db),
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
                    "error": "Standardized product not found",
                },
            )

        items = (
            db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH == product_id)
            .all()
        )

        items = filter_items_for_standard_product(spch, items)

        from backend.app.utils.source_normalization import normalize_source_code

        try:
            from dateutil.relativedelta import relativedelta
        except ImportError:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": "Thiếu thư viện python-dateutil trong môi trường backend.",
                },
            )

        source_data = {}
        total_points = 0

        now = datetime.utcnow()
        cutoff_date = None

        if range == "1m":
            cutoff_date = now - relativedelta(months=1)
        elif range == "3m":
            cutoff_date = now - relativedelta(months=3)
        elif range == "6m":
            cutoff_date = now - relativedelta(months=6)

        all_time_low = None
        all_time_low_dt = None
        range_low = None

        for item in items:
            source_code, source_name = normalize_source_code(item.sanTMDT or "")
            if not source_code:
                continue

            if source_code not in source_data:
                source_data[source_code] = {
                    "sourceName": source_name,
                    "daily_min": {},
                }

            history_records = (
                db.query(LichSuGia)
                .filter(LichSuGia.maSPTho == item.maSPTho)
                .all()
            )

            for record in history_records:
                gia = float(record.gia) if record.gia else 0

                if gia <= 0:
                    continue

                if (
                    all_time_low is None
                    or gia < all_time_low["price"]
                    or (
                        gia == all_time_low["price"]
                        and record.ngayGhiNhan < all_time_low_dt
                    )
                ):
                    all_time_low = {
                        "price": gia,
                        "date": record.ngayGhiNhan.strftime("%Y-%m-%d"),
                        "sourceName": source_name,
                    }
                    all_time_low_dt = record.ngayGhiNhan

                if cutoff_date and record.ngayGhiNhan < cutoff_date:
                    continue

                if record.ngayGhiNhan > now:
                    continue

                if range_low is None or gia < range_low:
                    range_low = gia

                date_str = record.ngayGhiNhan.strftime("%Y-%m-%d")
                current_min = source_data[source_code]["daily_min"].get(date_str)

                if current_min is None or gia < current_min:
                    source_data[source_code]["daily_min"][date_str] = gia

        series = []

        for source_code, source_info in source_data.items():
            daily_min_dict = source_info["daily_min"]

            if not daily_min_dict:
                continue

            points = []
            for date_str in sorted(daily_min_dict.keys()):
                points.append({
                    "date": date_str,
                    "price": daily_min_dict[date_str],
                })
                total_points += 1

            series.append({
                "sourceCode": source_code,
                "sourceName": source_info["sourceName"],
                "points": points,
            })

        return {
            "success": True,
            "data": {
                "series": series,
                "sourceCount": len(series),
                "pointCount": total_points,
                "rangeSummary": {
                    "lowestPrice": range_low,
                } if range_low is None or range_low > 0 else None,
                "allTimeLow": all_time_low,
            },
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}",
            },
        )
