from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

from sqlalchemy.orm import Session

from backend.app.services.scraper_service import ScraperService
from backend.app.services.text_matching_service import TextMatchingService
from backend.app.services.data_sync_service import DataSyncService


def run_source_scraper(
    source_name: str,
    search_func: Callable[[str], list[dict[str, Any]]],
    keyword: str
) -> dict[str, Any]:
    try:
        items = search_func(keyword) or []

        return {
            "source": source_name,
            "status": "success" if items else "no_result",
            "raw_count": len(items),
            "items": items,
            "error": None
        }

    except Exception as error:
        return {
            "source": source_name,
            "status": "error",
            "raw_count": 0,
            "items": [],
            "error": str(error)
        }


def scrape_and_sync_keyword(keyword: str, db: Session):
    keyword = " ".join(keyword.strip().split())

    scraper_service = ScraperService()

    source_jobs = [
        ("FPT Shop", scraper_service.search_fptshop),
        ("CellPhoneS", scraper_service.search_cellphones),
        ("Hoàng Hà Mobile", scraper_service.search_hoanghamobile),
        ("Lazada", scraper_service.search_lazada),
        ("Tiki", scraper_service.search_tiki),
    ]

    source_order = {
        source_name: index
        for index, (source_name, _) in enumerate(source_jobs)
    }

    source_results = []

    with ThreadPoolExecutor(max_workers=len(source_jobs)) as executor:
        future_to_source = {
            executor.submit(run_source_scraper, source_name, search_func, keyword): source_name
            for source_name, search_func in source_jobs
        }

        for future in as_completed(future_to_source):
            source_results.append(future.result())

    source_results.sort(
        key=lambda result: source_order.get(result["source"], 999)
    )

    raw_items = []
    source_status = []

    for result in source_results:
        items = result.get("items", [])
        raw_items.extend(items)

        source_status.append({
            "source": result.get("source"),
            "status": result.get("status"),
            "raw_count": result.get("raw_count", 0),
            "error": result.get("error")
        })

    text_matching_service = TextMatchingService()
    filtered_items = text_matching_service.filter_relevant_items(raw_items, keyword)
    groups = text_matching_service.group_products(filtered_items)

    data_sync_service = DataSyncService(db)
    sync_result = data_sync_service.sync_groups(groups)

    return {
        "keyword": keyword,
        "total_raw_items": len(raw_items),
        "total_filtered_items": len(filtered_items),
        "total_groups": len(groups),
        "source_status": source_status,
        "sync_result": sync_result
    }
