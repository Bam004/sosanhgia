from celery import Celery

from backend.app.core.config import settings

celery_app = Celery(
    "sosanhgia",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "backend.app.tasks.search_tasks",
    ],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=False,
)
