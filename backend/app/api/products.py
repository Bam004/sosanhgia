from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import SanPhamTho, LichSuGia, SanPhamChuanHoa


router = APIRouter(
    prefix="/api/products",
    tags=["So sanh gia"]
)


def item_to_response(item: SanPhamTho) -> dict:
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
        "ngayCapNhat": item.ngayCapNhat.isoformat() if item.ngayCapNhat else None
    }


@router.get("/compare/{product_id}")
def compare_product_prices(
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        from backend.app.api.search import is_accessory, ACCESSORY_KEYWORDS
        spch = db.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.maSPCH == product_id).first()
        is_accessory_group = False
        if spch:
            kw_lower = (spch.tenChuanHoa or "").lower()
            is_accessory_group = any(kw in kw_lower for kw in ACCESSORY_KEYWORDS)

        items = (
            db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH == product_id)
            .all()
        )
        
        filtered_items = []
        for item in items:
            if not is_accessory_group and is_accessory(item.tenSanPham):
                continue
            filtered_items.append(item)
            
        items = filtered_items

        if len(items) == 0:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Resource with specified ID not found or filtered out"
                }
            )

        # Sắp xếp thủ công: giá > 0 tăng dần, giá = 0 đẩy xuống cuối
        items.sort(key=lambda x: float(x.giaHienTai) if x.giaHienTai and x.giaHienTai > 0 else float('inf'))

        prices = [float(item.giaHienTai) for item in items if item.giaHienTai is not None and item.giaHienTai > 0]

        return {
            "success": True,
            "data": {
                "standardized_product_id": product_id,
                "total_merchants": len(items),
                "lowest_price": min(prices) if prices else None,
                "highest_price": max(prices) if prices else None,
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

@router.get("/{product_id}/history")
def get_product_price_history(
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        items = db.query(SanPhamTho).filter(SanPhamTho.maSPCH == product_id).all()
        if not items:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "Product not found"
                }
            )
        
        history_data = []
        for item in items:
            history_records = db.query(LichSuGia).filter(LichSuGia.maSPTho == item.maSPTho).order_by(LichSuGia.ngayGhiNhan.asc()).all()
            if history_records:
                history_data.append({
                    "maSPTho": item.maSPTho,
                    "sanTMDT": item.sanTMDT,
                    "history": [
                        {
                            "gia": float(record.gia),
                            "ngayGhiNhan": record.ngayGhiNhan.isoformat()
                        } for record in history_records
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