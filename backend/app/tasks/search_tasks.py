from datetime import datetime

from backend.app.core.celery_app import celery_app
from backend.app.core.database import SessionLocal
from backend.app.models.search_job import SearchJob
from backend.app.services.scrape_pipeline_service import scrape_and_sync_keyword


@celery_app.task(name="search.run_search_job")
def run_search_job_task(job_id: int, keyword: str) -> dict:
    db = SessionLocal()

    try:
        job = db.get(SearchJob, job_id)

        if not job:
            return {
                "success": False,
                "error": "Search job not found",
                "job_id": job_id,
            }

        now = datetime.utcnow()
        job.trangThai = "running"
        job.batDauLuc = now
        job.errorMessage = None

        for source_status in job.source_statuses:
            source_status.trangThai = "running"
            source_status.batDauLuc = now
            source_status.errorMessage = None

        db.commit()

        scrape_result = scrape_and_sync_keyword(keyword, db)

        source_result_map = {
            item.get("source_code"): item
            for item in scrape_result.get("source_status", [])
        }

        finished_at = datetime.utcnow()

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

        failed_at = datetime.utcnow()
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
