from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session

from backend.app.services.scraper_service import ScraperService
from backend.app.services.text_matching_service import TextMatchingService
from backend.app.services.data_sync_service import DataSyncService


def scrape_and_sync_keyword(keyword: str, db: Session):
    keyword = " ".join(keyword.strip().split())

    scraper_service = ScraperService()

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

    data_sync_service = DataSyncService(db)
    sync_result = data_sync_service.sync_groups(groups)

    return sync_result