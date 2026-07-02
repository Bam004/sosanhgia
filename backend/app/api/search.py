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

        # Run spiders in parallel from FPT Shop, CellPhoneS, Hoang Ha Mobile, Lazada and Tiki.
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_fpt = executor.submit(scraper_service.search_fptshop, keyword)
            future_cps = executor.submit(scraper_service.search_cellphones, keyword)
            future_hhm = executor.submit(scraper_service.search_hoanghamobile, keyword)
            future_lazada = executor.submit(scraper_service.search_lazada, keyword)
            future_tiki = executor.submit(scraper_service.search_tiki, keyword)

            items_fpt = future_fpt.result()
            items_cps = future_cps.result()
            items_hhm = future_hhm.result()
            items_lazada = future_lazada.result()
            items_tiki = future_tiki.result()

        items = items_fpt + items_cps + items_hhm + items_lazada + items_tiki

        text_matching_service = TextMatchingService()
        items = text_matching_service.filter_relevant_items(items, keyword)
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

