import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.models.search_job import SearchJob
from backend.app.core.database import SessionLocal

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@patch("backend.app.api.search_jobs.run_search_job_task.delay")
def test_post_search_job_enqueues_task(mock_delay, db_session: Session):
    """
    Test 1: POST /api/search/jobs validates keyword, creates a job, and enqueues it
    without running the scraper directly.
    """
    mock_celery_result = MagicMock()
    mock_celery_result.id = "mock-task-123"
    mock_delay.return_value = mock_celery_result

    keyword = f"unique_keyword_{uuid.uuid4().hex[:8]}"
    response = client.post(f"/api/search/jobs?keyword={keyword}")

    print(response.json())
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["celery_task_id"] == "mock-task-123"

    # Assert delay was called exactly once
    mock_delay.assert_called_once()

    # Assert it was saved to DB as 'pending'
    job_id = data["data"]["job_id"]
    job = db_session.get(SearchJob, job_id)
    assert job is not None
    assert job.trangThai == "pending"

@patch("backend.app.api.search_jobs.run_search_job_task.delay")
def test_post_search_job_enqueue_failure_updates_status(mock_delay, db_session: Session):
    """
    Test 2: If Celery task enqueuing fails (Redis down), job is marked as failed,
    and returns 503 instead of hanging or returning success.
    """
    mock_delay.side_effect = Exception("Redis connection error")

    response = client.post("/api/search/jobs?keyword=samsung")

    print(response.json())
    assert response.status_code == 503
    data = response.json()
    assert data["success"] is False
    assert "Cannot enqueue Celery task" in data["error"]

    # Verify the job was marked failed in DB
    job_id = data["data"]["job_id"]
    job = db_session.get(SearchJob, job_id)
    assert job.trangThai == "failed"
    assert "Redis connection error" in job.errorMessage

@patch("backend.app.tasks.search_tasks.scrape_and_sync_keyword")
@patch("backend.app.tasks.search_tasks.bump_search_cache_version")
def test_run_search_job_task_success(mock_bump_cache, mock_scrape, db_session: Session):
    """
    Test 3: The Celery worker task correctly transitions states, updates DB,
    and invalidates cache on success.
    """
    mock_scrape.return_value = {
        "total_raw_items": 10,
        "total_filtered_items": 8,
        "total_groups": 1,
        "source_status": []
    }

    # Tạo sẵn một pending job
    job = SearchJob(keyword="macbook", keywordChuanHoa="macbook", trangThai="pending")
    db_session.add(job)
    db_session.commit()

    # Gọi hàm worker trực tiếp
    from backend.app.tasks.search_tasks import run_search_job_task

    with patch(
        "backend.app.tasks.price_alerts.check_price_alerts_task.delay"
    ):
        result = run_search_job_task(job.maSearchJob, "macbook")

    assert result["success"] is True

    db_session.refresh(job)
    assert job.trangThai == "completed"
    assert job.tongRawItems == 10

    # 6. Cache bump được gọi
    mock_bump_cache.assert_called_once_with("macbook")

@patch("backend.app.tasks.search_tasks.scrape_and_sync_keyword")
def test_run_search_job_task_exception(mock_scrape, db_session: Session):
    """
    Test 4: The Celery worker gracefully handles exceptions, rolls back,
    and marks job as failed.
    """
    job = SearchJob(keyword="ipad", keywordChuanHoa="ipad", trangThai="pending")
    db_session.add(job)
    db_session.commit()

    mock_scrape.side_effect = Exception("Scraper crashed")

    from backend.app.tasks.search_tasks import run_search_job_task
    result = run_search_job_task(job.maSearchJob, "ipad")

    assert result["success"] is False
    assert "Scraper crashed" in result["error"]

    # Check DB status
    db_session.refresh(job)
    assert job.trangThai == "failed"
    assert job.errorMessage == "Scraper crashed"
