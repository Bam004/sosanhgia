from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

from sqlalchemy.orm import Session

from backend.app.services.scraper_service import ScraperService
from backend.app.services.text_matching_service import TextMatchingService
from backend.app.services.data_sync_service import DataSyncService


SOURCE_CONFIGS = [
    {
        "code": "fptshop",
        "name": "FPT Shop",
        "spider_source_names": ["FPT Shop", "FPTShop", "fptshop"],
    },
    {
        "code": "cellphones",
        "name": "CellPhoneS",
        "spider_source_names": ["CellPhoneS", "Cellphones", "cellphones"],
    },
    {
        "code": "hoanghamobile",
        "name": "Hoang Ha Mobile",
        "spider_source_names": ["Hoang Ha Mobile", "HoangHa Mobile", "hoanghamobile"],
    },
    {
        "code": "lazada",
        "name": "Lazada",
        "spider_source_names": ["Lazada", "lazada"],
    },
    {
        "code": "tiki",
        "name": "Tiki",
        "spider_source_names": ["Tiki", "tiki"],
    },
]


def get_source_config_by_name(source_name: str) -> dict[str, Any]:
    for source_config in SOURCE_CONFIGS:
        if source_config["name"] == source_name:
            return source_config

    return {
        "code": source_name.lower().replace(" ", "_"),
        "name": source_name,
        "spider_source_names": [source_name],
    }


def get_item_source_name(item: dict[str, Any]) -> str:
    return (
        item.get("sanTMDT")
        or item.get("source")
        or item.get("merchant_name")
        or item.get("nguon")
        or ""
    )


def is_item_from_source(item: dict[str, Any], source_config: dict[str, Any]) -> bool:
    item_source_name = get_item_source_name(item)

    return item_source_name in source_config["spider_source_names"]


def run_source_scraper(
    source_name: str,
    search_func: Callable[[str], list[dict[str, Any]]],
    keyword: str
) -> dict[str, Any]:
    source_config = get_source_config_by_name(source_name)

    try:
        items = search_func(keyword) or []

        return {
            "source": source_config["name"],
            "source_code": source_config["code"],
            "source_name": source_config["name"],
            "status": "success" if items else "no_result",
            "raw_count": len(items),
            "matched_count": 0,
            "items": items,
            "error": None,
        }

    except Exception as error:
        return {
            "source": source_config["name"],
            "source_code": source_config["code"],
            "source_name": source_config["name"],
            "status": "error",
            "raw_count": 0,
            "matched_count": 0,
            "items": [],
            "error": str(error),
        }


def scrape_and_sync_keyword(keyword: str, db: Session):
    keyword = " ".join(keyword.strip().split())

    scraper_service = ScraperService()

    source_jobs = [
        ("FPT Shop", scraper_service.search_fptshop),
        ("CellPhoneS", scraper_service.search_cellphones),
        ("Hoang Ha Mobile", scraper_service.search_hoanghamobile),
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
            "source_code": result.get("source_code"),
            "source_name": result.get("source_name"),
            "status": result.get("status"),
            "raw_count": result.get("raw_count", 0),
            "matched_count": 0,
            "error": result.get("error"),
        })

    text_matching_service = TextMatchingService()
    filtered_items = text_matching_service.filter_relevant_items(raw_items, keyword)
    groups = text_matching_service.group_products(filtered_items)

    for status_item in source_status:
        source_config = get_source_config_by_name(status_item["source"])

        matched_count = sum(
            1
            for item in filtered_items
            if is_item_from_source(item, source_config)
        )

        status_item["matched_count"] = matched_count

    data_sync_service = DataSyncService(db)
    sync_result = data_sync_service.sync_groups(groups)

    return {
        "keyword": keyword,
        "total_raw_items": len(raw_items),
        "total_filtered_items": len(filtered_items),
        "total_groups": len(groups),
        "source_status": source_status,
        "sync_result": sync_result,
    }

