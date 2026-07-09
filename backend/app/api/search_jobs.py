from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.api.search import normalize_search_text
from backend.app.core.database import SessionLocal, get_db
from backend.app.models.search_job import SearchJob, SearchJobSourceStatus
from backend.app.services.scrape_pipeline_service import scrape_and_sync_keyword

router = APIRouter(
    prefix="/api/search/jobs",
    tags=["Search Jobs"]
)

SOURCE_INFOS = [
    {
        "code": "fptshop",
        "name": "FPT Shop",
    },
    {
        "code": "cellphones",
        "name": "CellPhoneS",
    },
    {
        "code": "hoanghamobile",
        "name": "Hoang Ha Mobile",
    },
    {
        "code": "lazada",
        "name": "Lazada",
    },
    {
        "code": "tiki",
        "name": "Tiki",
    },
]


def get_source_code(source_name: str) -> str:
    for source_info in SOURCE_INFOS:
        if source_info["name"] == source_name:
            return source_info["code"]

    return source_name.lower().replace(" ", "_")


def get_source_name(source_code: str, fallback_name: str) -> str:
    for source_info in SOURCE_INFOS:
        if source_info["code"] == source_code:
            return source_info["name"]

    return fallback_name


def get_source_order(source_name: str) -> int:
    source_code = get_source_code(source_name)

    for index, source_info in enumerate(SOURCE_INFOS):
        if source_info["code"] == source_code:
            return index

    return 999


def serialize_source_status(source_status: SearchJobSourceStatus) -> dict[str, Any]:
    source_code = get_source_code(source_status.nguon)

    return {
        "maSourceStatus": source_status.maSourceStatus,
        "maSearchJob": source_status.maSearchJob,
        "source": source_status.nguon,
        "source_code": source_code,
        "source_name": get_source_name(source_code, source_status.nguon),
        "status": source_status.trangThai,
        "raw_count": source_status.rawCount,
        "matched_count": source_status.matchedCount,
        "error": source_status.errorMessage,
        "started_at": source_status.batDauLuc,
        "finished_at": source_status.ketThucLuc,
        "updated_at": source_status.ngayCapNhat,
    }


def serialize_search_job(job: SearchJob) -> dict[str, Any]:
    source_statuses = sorted(
        job.source_statuses,
        key=lambda item: get_source_order(item.nguon)
    )

    return {
        "job_id": job.maSearchJob,
        "keyword": job.keyword,
        "keyword_normalized": job.keywordChuanHoa,
        "status": job.trangThai,
        "total_raw_items": job.tongRawItems,
        "total_filtered_items": job.tongFilteredItems,
        "total_groups": job.tongGroups,
        "error": job.errorMessage,
        "created_at": job.ngayTao,
        "started_at": job.batDauLuc,
        "finished_at": job.ketThucLuc,
        "source_status": [
            serialize_source_status(source_status)
            for source_status in source_statuses
        ],
    }


def run_search_job(job_id: int, keyword: str) -> None:
    db = SessionLocal()

    try:
        job = db.get(SearchJob, job_id)
        if not job:
            return

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
            return

        job.trangThai = "completed"
        job.tongRawItems = scrape_result.get("total_raw_items", 0)
        job.tongFilteredItems = scrape_result.get("total_filtered_items", 0)
        job.tongGroups = scrape_result.get("total_groups", 0)
        job.ketThucLuc = finished_at
        job.errorMessage = None

        for source_status in job.source_statuses:
            source_code = get_source_code(source_status.nguon)
            result = source_result_map.get(source_code, {})

            source_status.trangThai = result.get("status", "no_result")
            source_status.rawCount = result.get("raw_count", 0)
            source_status.matchedCount = result.get("matched_count", 0)
            source_status.errorMessage = result.get("error")
            source_status.ketThucLuc = finished_at

        db.commit()

    except Exception as error:
        db.rollback()

        failed_at = datetime.utcnow()
        job = db.get(SearchJob, job_id)

        if job:
            job.trangThai = "failed"
            job.errorMessage = str(error)
            job.ketThucLuc = failed_at

            for source_status in job.source_statuses:
                if source_status.trangThai == "running":
                    source_status.trangThai = "error"
                    source_status.errorMessage = str(error)
                    source_status.ketThucLuc = failed_at

            db.commit()

    finally:
        db.close()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_search_job(
    background_tasks: BackgroundTasks,
    keyword: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    try:
        keyword = " ".join(keyword.strip().split())
        keyword_normalized = normalize_search_text(keyword)

        job = SearchJob(
            keyword=keyword,
            keywordChuanHoa=keyword_normalized,
            trangThai="pending",
        )

        db.add(job)
        db.flush()

        for source_info in SOURCE_INFOS:
            db.add(
                SearchJobSourceStatus(
                    maSearchJob=job.maSearchJob,
                    nguon=source_info["name"],
                    trangThai="pending",
                )
            )

        db.commit()
        db.refresh(job)

        background_tasks.add_task(run_search_job, job.maSearchJob, keyword)

        return {
            "success": True,
            "message": "Search job created",
            "data": serialize_search_job(job),
        }

    except Exception as error:
        db.rollback()

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": str(error),
            }
        )


@router.get("/{job_id}")
def get_search_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    job = db.get(SearchJob, job_id)

    if not job:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "error": "Search job not found",
            }
        )

    return {
        "success": True,
        "data": serialize_search_job(job),
    }

