from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse

from backend.app.services.scraper_service import ScraperService
from backend.app.services.text_matching_service import TextMatchingService


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

        # Run spiders in parallel from FPT Shop, CellPhoneS, Hoang Ha Mobile and Lazada.
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_fpt = executor.submit(scraper_service.search_fptshop, keyword)
            future_cps = executor.submit(scraper_service.search_cellphones, keyword)
            future_hhm = executor.submit(scraper_service.search_hoanghamobile, keyword)
            future_lazada = executor.submit(scraper_service.search_lazada, keyword)

            items_fpt = future_fpt.result()
            items_cps = future_cps.result()
            items_hhm = future_hhm.result()
            items_lazada = future_lazada.result()

        items = items_fpt + items_cps + items_hhm + items_lazada

        text_matching_service = TextMatchingService()
        groups = text_matching_service.group_products(items)

        sources = sorted({
            item.get("sanTMDT")
            for item in items
            if item.get("sanTMDT")
        })

        return {
            "success": True,
            "data": {
                "keyword": keyword,
                "total_items": len(items),
                "total_groups": len(groups),
                "sources": sources,
                "groups": groups,
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
