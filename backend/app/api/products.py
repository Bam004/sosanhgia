from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models import SanPhamChuanHoa, SanPhamTho
from backend.app.schemas import SanPhamChuanHoaResponse, SanPhamThoResponse
from backend.app.services.text_matching_service import TextMatchingService
from backend.app.services.product_grouping_service import auto_group_ungrouped_products


router = APIRouter(
    prefix="/api/products",
    tags=["So sanh gia"]
)


def item_to_response(item: SanPhamTho) -> dict:
    return jsonable_encoder(SanPhamThoResponse.model_validate(item))

def standardized_product_to_response(product: SanPhamChuanHoa) -> dict:
    return jsonable_encoder(SanPhamChuanHoaResponse.model_validate(product))

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
    standardized_product: SanPhamChuanHoa
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
        items[0] if items else None
    )

    standardized_product.soSanPhamTho = len(items)
    standardized_product.soNguonBan = len(sources)
    standardized_product.giaThapNhat = min(prices) if prices else None
    standardized_product.giaCaoNhat = max(prices) if prices else None
    standardized_product.trangThai = determine_standardized_status(
        total_sources=len(sources),
        need_review=standardized_product.canKiemTra
    )

    if representative_item and not standardized_product.hinhAnhChinh:
        standardized_product.hinhAnhChinh = representative_item.hinhAnh

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
                "error": f"Database error: {str(error)}"
            }
        )

@router.post("/standardized/auto-group")
def auto_group_standardized_products(db: Session = Depends(get_db)):
    try:
        ket_qua = auto_group_ungrouped_products(db)

        return {
            "success": ket_qua.get("success", True),
            "message": ket_qua.get("message", "T? ??ng t?o nh?m s?n ph?m chu?n h?a ho?n t?t"),
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
    db: Session = Depends(get_db)
):
    try:
        items = (
            db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH == product_id)
            .order_by(SanPhamTho.giaHienTai.asc())
            .all()
        )

        if len(items) == 0:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Resource with specified ID not found"
                }
            )

        prices = [item.giaHienTai for item in items]

        return {
            "success": True,
            "data": {
                "standardized_product_id": product_id,
                "total_merchants": len(items),
                "lowest_price": min(prices),
                "highest_price": max(prices),
                "items": [item_to_response(item) for item in items]
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

