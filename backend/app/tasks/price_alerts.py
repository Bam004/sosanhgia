import logging
from celery import shared_task

from backend.app.core.database import SessionLocal
from backend.app.services.price_alert_service import check_price_alerts

logger = logging.getLogger(__name__)

@shared_task(name="tasks.check_price_alerts")
def check_price_alerts_task():
    logger.info("Starting check_price_alerts_task")
    db = SessionLocal()
    try:
        stats = check_price_alerts(db)
        logger.info(f"Finished check_price_alerts_task. Stats: {stats}")
        return stats
    except Exception as e:
        logger.error(f"Error in check_price_alerts_task: {e}")
        raise
    finally:
        db.close()
