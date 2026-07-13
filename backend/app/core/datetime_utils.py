from datetime import datetime, timezone


def utc_now() -> datetime:
    """Trả về thời gian UTC có thông tin múi giờ."""
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """Trả về thời gian UTC không kèm múi giờ cho các cột DateTime hiện tại."""
    return utc_now().replace(tzinfo=None)
