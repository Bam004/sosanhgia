import json
import redis
import logging
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

CACHE_TTL = 300
CACHE_PREFIX = "search:result"

def get_redis_client():
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def normalize_cache_keyword(keyword: str) -> str:
    return " ".join(keyword.strip().split()).lower()

def build_search_cache_key(keyword: str) -> str:
    norm = normalize_cache_keyword(keyword)
    return f"{CACHE_PREFIX}:{norm}"

def get_cached_search_result(keyword: str) -> dict | None:
    try:
        r = get_redis_client()
        key = build_search_cache_key(keyword)
        cached = r.get(key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.error(f"Redis get cache error: {e}")
    return None

def set_cached_search_result(keyword: str, data: dict) -> None:
    try:
        r = get_redis_client()
        key = build_search_cache_key(keyword)
        # Ensure ASCII is false to keep Vietnamese characters intact in Redis
        r.setex(key, CACHE_TTL, json.dumps(data, ensure_ascii=False))
    except Exception as e:
        logger.error(f"Redis set cache error: {e}")

def invalidate_search_cache(keyword: str) -> None:
    try:
        r = get_redis_client()
        key = build_search_cache_key(keyword)
        r.delete(key)
    except Exception as e:
        logger.error(f"Redis invalidate cache error: {e}")