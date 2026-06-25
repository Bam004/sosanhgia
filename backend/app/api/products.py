from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import SanPhamTho
from backend.app.schemas import SanPhamThoResponse


router = APIRouter(
    prefix="/api/products",
    tags=["So sanh gia"]
)


def item_to_response(item: SanPhamTho) -> dict:
    return jsonable_encoder(SanPhamThoResponse.model_validate(item))


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