import logging

from backend.app.core.celery_app import celery_app
from backend.app.core.database import SessionLocal
from backend.app.services.price_alert_service import check_price_alerts

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.check_price_alerts")
def check_price_alerts_task():
    logger.info("Starting check_price_alerts_task")

    db = SessionLocal()

    try:
        stats = check_price_alerts(db)
        logger.info(
            "Finished check_price_alerts_task. Stats: %s",
            stats,
        )
        return stats
    except Exception:
        logger.exception("Error in check_price_alerts_task")
        raise
    finally:
        db.close()

