from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.services.scrape_pipeline_service import scrape_and_sync_keyword

router = APIRouter(
    prefix="/api/scrape",
    tags=["Scrape Data"]
)


@router.post("/trigger", status_code=status.HTTP_200_OK)
def trigger_scrape(
    keyword: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    try:
        sync_result = scrape_and_sync_keyword(keyword, db)

        return {
            "success": True,
            "message": "Scrape and sync completed",
            "data": sync_result
        }

    except Exception as error:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": str(error)
            }
        )