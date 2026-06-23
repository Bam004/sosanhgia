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

router = APIRouter(
    prefix="/api/items",
    tags=["San pham tho"]
)


def item_to_response(item: SanPhamTho) -> dict:
    return jsonable_encoder(SanPhamThoResponse.model_validate(item))


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