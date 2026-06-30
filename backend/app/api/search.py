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

        # Gọi các spider để cào dữ liệu song song từ FPT Shop và CellphoneS theo từ khóa.
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_fpt = executor.submit(scraper_service.search_fptshop, keyword)
            future_cps = executor.submit(scraper_service.search_cellphones, keyword)
            items_fpt = future_fpt.result()
            items_cps = future_cps.result()

        items = items_fpt + items_cps

        # Gom nhóm các sản phẩm tương đồng bằng Text Matching.
        text_matching_service = TextMatchingService()
        groups = text_matching_service.group_products(items)

        # Lấy danh sách nguồn dữ liệu có trong kết quả cào.
        sources = sorted({
            item.get("sanTMDT")
            for item in items
            if item.get("sanTMDT")
        })

        # Trả về cả danh sách sản phẩm thô và danh sách đã gom nhóm.
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


