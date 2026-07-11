import re
from decimal import Decimal, InvalidOperation
from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models import SanPhamTho
from backend.app.schemas import (
    SanPhamThoCreate,
    SanPhamThoResponse,
    SanPhamThoUpdate,
)
from backend.app.schemas.san_pham_tho import SanPhamThoBulkCreate

router = APIRouter(
    prefix="/api/items",
    tags=["San pham tho"]
)


def item_to_response(item: SanPhamTho) -> dict:
    return jsonable_encoder(SanPhamThoResponse.model_validate(item))


def normalize_price(raw_price) -> Decimal:
    price_text = str(raw_price).strip()

    price_text = price_text.replace("₫", "")
    price_text = price_text.replace("VNĐ", "")
    price_text = price_text.replace("vnđ", "")
    price_text = price_text.replace(",", "")
    price_text = price_text.replace(".", "")
    price_text = re.sub(r"\s+", "", price_text)

    if not price_text.isdigit():
        raise ValueError("Invalid price format")

    try:
        return Decimal(price_text)
    except InvalidOperation:
        raise ValueError("Invalid price format")

import math

def normalize_seller_name(name) -> str | None:
    if name is None:
        return None
    cleaned = str(name).strip()
    if not cleaned:
        return None
    return cleaned

def normalize_seller_rating(rating) -> float | None:
    if rating is None:
        return None
    if isinstance(rating, bool):
        return None
    try:
        val = float(rating)
        if not math.isfinite(val):
            return None
        return val
    except (ValueError, TypeError):
        return None

def not_found_response() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "success": False,
            "error": "Resource with specified ID not found"
        }
    )


@router.get("")
def get_items(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    limit = min(limit, 100)

    items = (
        db.query(SanPhamTho)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "data": [item_to_response(item) for item in items]
    }


@router.get("/{item_id}")
def get_item_by_id(
    item_id: int,
    db: Session = Depends(get_db)
):
    item = (
        db.query(SanPhamTho)
        .filter(SanPhamTho.maSPTho == item_id)
        .first()
    )

    if item is None:
        return not_found_response()

    return {
        "success": True,
        "data": item_to_response(item)
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_item(
    payload: SanPhamThoCreate,
    db: Session = Depends(get_db)
):
    try:
        item = SanPhamTho(**payload.model_dump())

        db.add(item)
        db.commit()
        db.refresh(item)

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": "Created successfully",
                "id": item.maSPTho
            }
        )

    except SQLAlchemyError as error:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )


@router.put("/{item_id}")
def update_item(
    item_id: int,
    payload: SanPhamThoUpdate,
    db: Session = Depends(get_db)
):
    item = (
        db.query(SanPhamTho)
        .filter(SanPhamTho.maSPTho == item_id)
        .first()
    )

    if item is None:
        return not_found_response()

    try:
        update_data = payload.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(item, field, value)

        db.commit()
        db.refresh(item)

        return {
            "success": True,
            "data": item_to_response(item)
        }

    except SQLAlchemyError as error:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    item = (
        db.query(SanPhamTho)
        .filter(SanPhamTho.maSPTho == item_id)
        .first()
    )

    if item is None:
        return not_found_response()

    try:
        db.delete(item)
        db.commit()

        return {
            "success": True,
            "message": "Deleted successfully"
        }

    except SQLAlchemyError as error:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )
    
@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_items_bulk(
    payload: list[SanPhamThoBulkCreate],
    db: Session = Depends(get_db)
):
    if len(payload) == 0:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": "Validation failed: Payload must not be empty"
            }
        )

    created_items = []

    try:
        for raw_item in payload:
            clean_title = re.sub(r"\s+", " ", raw_item.raw_title).strip()
            clean_price = normalize_price(raw_item.current_price)
            clean_seller_name = normalize_seller_name(raw_item.sellerName)
            clean_seller_rating = normalize_seller_rating(raw_item.sellerRating)

            item = SanPhamTho(
                maSPCH=raw_item.standardized_product_id,
                tenSanPham=clean_title,
                sanTMDT=raw_item.merchant_name.strip(),
                giaHienTai=clean_price,
                linkGoc=raw_item.origin_url.strip(),
                hinhAnh=raw_item.image_url,
                danhGia=raw_item.rating,
                soLuongDanhGia=raw_item.review_count,
                attributes=raw_item.attributes,
                sellerName=clean_seller_name,
                sellerRating=clean_seller_rating
            )

            db.add(item)
            created_items.append(item)

        db.commit()

        for item in created_items:
            db.refresh(item)

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": "Bulk created successfully",
                "total": len(created_items),
                "ids": [item.maSPTho for item in created_items]
            }
        )

    except ValueError as error:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Validation failed: {str(error)}"
            }
        )

    except SQLAlchemyError as error:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )