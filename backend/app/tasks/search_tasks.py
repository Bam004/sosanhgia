import logging
import time
from datetime import datetime

from backend.app.core.celery_app import celery_app
from backend.app.core.database import SessionLocal
from backend.app.models.search_job import SearchJob
from backend.app.services.scrape_pipeline_service import scrape_and_sync_keyword
from backend.app.services.search_cache_service import bump_search_cache_version
from backend.app.core.datetime_utils import utc_now_naive


logger = logging.getLogger(__name__)


@celery_app.task(name="search.run_search_job")
def run_search_job_task(job_id: int, keyword: str) -> dict:
    db = SessionLocal()
    task_started_at = time.perf_counter()

    try:
        logger.info(
            "[SearchJob %s] Bắt đầu xử lý từ khóa: %s",
            job_id,
            keyword,
        )

        stage_started_at = time.perf_counter()

        job = db.get(SearchJob, job_id)

        if not job:
            return {
                "success": False,
                "error": "Search job not found",
                "job_id": job_id,
            }

        now = utc_now_naive()
        job.trangThai = "running"
        job.batDauLuc = now
        job.errorMessage = None

        for source_status in job.source_statuses:
            source_status.trangThai = "running"
            source_status.batDauLuc = now
            source_status.errorMessage = None

        db.commit()

        logger.info(
            "[SearchJob %s] Cập nhật trạng thái running xong sau %.2f giây",
            job_id,
            time.perf_counter() - stage_started_at,
        )

        stage_started_at = time.perf_counter()

        scrape_result = scrape_and_sync_keyword(keyword, db)

        logger.info(
            "[SearchJob %s] scrape_and_sync_keyword hoàn tất sau %.2f giây",
            job_id,
            time.perf_counter() - stage_started_at,
        )

        source_result_map = {
            item.get("source_code"): item
            for item in scrape_result.get("source_status", [])
        }

        finished_at = utc_now_naive()

        stage_started_at = time.perf_counter()

        job = db.get(SearchJob, job_id)

        if not job:
            return {
                "success": False,
                "error": "Search job not found after scrape",
                "job_id": job_id,
            }

        job.trangThai = "completed"
        job.tongRawItems = scrape_result.get("total_raw_items", 0)
        job.tongFilteredItems = scrape_result.get("total_filtered_items", 0)
        job.tongGroups = scrape_result.get("total_groups", 0)
        job.ketThucLuc = finished_at
        job.errorMessage = None

        for source_status in job.source_statuses:
            source_code = source_status.nguon.lower().replace(" ", "_")

            if source_status.nguon == "FPT Shop":
                source_code = "fptshop"
            elif source_status.nguon == "CellPhoneS":
                source_code = "cellphones"
            elif source_status.nguon == "Hoang Ha Mobile":
                source_code = "hoanghamobile"

            result = source_result_map.get(source_code, {})

            source_status.trangThai = result.get("status", "no_result")
            source_status.rawCount = result.get("raw_count", 0)
            source_status.matchedCount = result.get("matched_count", 0)
            source_status.errorMessage = result.get("error")
            source_status.ketThucLuc = finished_at

        db.commit()

        logger.info(
            "[SearchJob %s] Lưu trạng thái completed xong sau %.2f giây",
            job_id,
            time.perf_counter() - stage_started_at,
        )

        stage_started_at = time.perf_counter()

        bump_search_cache_version(keyword)

        logger.info(
            "[SearchJob %s] Cập nhật cache xong sau %.2f giây",
            job_id,
            time.perf_counter() - stage_started_at,
        )

        from backend.app.tasks.price_alerts import check_price_alerts_task
        check_price_alerts_task.delay()

        total_elapsed = time.perf_counter() - task_started_at

        logger.info(
            "[SearchJob %s] Hoàn tất toàn bộ sau %.2f giây",
            job_id,
            total_elapsed,
        )

        return {
            "success": True,
            "job_id": job_id,
            "keyword": keyword,
            "total_raw_items": job.tongRawItems,
            "total_filtered_items": job.tongFilteredItems,
            "total_groups": job.tongGroups,
        }

    except Exception as error:
        db.rollback()

        logger.exception(
            "[SearchJob %s] Thất bại sau %.2f giây",
            job_id,
            time.perf_counter() - task_started_at,
        )

        failed_at = utc_now_naive()
        job = db.get(SearchJob, job_id)

        if job:
            job.trangThai = "failed"
            job.errorMessage = str(error)
            job.ketThucLuc = failed_at

            for source_status in job.source_statuses:
                if source_status.trangThai in ["pending", "running"]:
                    source_status.trangThai = "error"
                    source_status.errorMessage = str(error)
                    source_status.ketThucLuc = failed_at

            db.commit()

        return {
            "success": False,
            "job_id": job_id,
            "keyword": keyword,
            "error": str(error),
        }

    finally:
        db.close()

