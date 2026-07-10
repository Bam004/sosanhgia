from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.api.search import normalize_search_text
from backend.app.core.database import get_db
from backend.app.models.search_job import SearchJob, SearchJobSourceStatus
from backend.app.tasks.search_tasks import run_search_job_task

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


@router.post("", status_code=status.HTTP_201_CREATED)
def create_search_job(
    keyword: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    keyword = " ".join(keyword.strip().split())
    keyword_normalized = normalize_search_text(keyword)

    try:
        # 1. Chống duplicate: Kiểm tra xem có job nào đang pending/running cho keyword này không
        active_job = db.query(SearchJob).filter(
            SearchJob.keywordChuanHoa == keyword_normalized,
            SearchJob.trangThai.in_(["pending", "running"])
        ).order_by(SearchJob.ngayTao.desc()).first()

        if active_job:
            now = datetime.utcnow()
            # Nếu job tạo chưa quá 5 phút thì tái sử dụng
            if (now - active_job.ngayTao).total_seconds() < 300:
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "success": True,
                        "message": "Found existing active search job",
                        "celery_task_id": None,
                        "data": serialize_search_job(active_job),
                        "reused": True
                    }
                )
            else:
                # Job quá cũ (treo), đánh dấu failed và đi tiếp để tạo job mới
                active_job.trangThai = "failed"
                active_job.errorMessage = "Job timed out and was abandoned"
                db.commit()

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

        try:
            celery_result = run_search_job_task.delay(job.maSearchJob, keyword)
        except Exception as enqueue_error:
            job.trangThai = "failed"
            job.errorMessage = f"Cannot enqueue Celery task: {enqueue_error}"

            for source_status_item in job.source_statuses:
                source_status_item.trangThai = "error"
                source_status_item.errorMessage = job.errorMessage

            db.commit()
            db.refresh(job)

            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "success": False,
                    "error": job.errorMessage,
                    "data": serialize_search_job(job),
                }
            )

        return {
            "success": True,
            "message": "Search job created and queued",
            "celery_task_id": celery_result.id,
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
