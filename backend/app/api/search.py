from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse

from backend.app.services.scraper_service import ScraperService


router = APIRouter(
    prefix="/api/search",
    tags=["Tim kiem realtime"]
)


@router.get("")
def search_products(
    keyword: str = Query(..., min_length=1)
):
    try:
        scraper_service = ScraperService()
        items = scraper_service.search_fptshop(keyword)

        return {
            "success": True,
            "data": {
                "keyword": keyword,
                "total": len(items),
                "sources": ["FPT Shop"],
                "items": items
            }
        }

    except ValueError as error:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": str(error)
            }
        )

    except RuntimeError as error:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": str(error)
            }
        )

