import json
import redis
import logging
from backend.app.core.config import settings
from backend.app.core.utils import normalize_search_text

logger = logging.getLogger(__name__)

CACHE_TTL = 300
CACHE_PREFIX = "search:result"
CACHE_VERSION_PREFIX = "search:version"

def get_redis_client():
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def build_search_cache_key(keyword: str) -> str:
    norm = normalize_search_text(keyword)
    return f"{CACHE_PREFIX}:{norm}"

def build_search_cache_version_key(keyword: str) -> str:
    norm = normalize_search_text(keyword)
    return f"{CACHE_VERSION_PREFIX}:{norm}"

def get_search_cache_version(keyword: str) -> int:
    try:
        r = get_redis_client()
        key = build_search_cache_version_key(keyword)
        v = r.get(key)
        if v is not None:
            return int(v)
    except Exception as e:
        logger.error(f"Redis get cache version error: {e}")
    return 0

def bump_search_cache_version(keyword: str) -> None:
    try:
        r = get_redis_client()
        version_key = build_search_cache_version_key(keyword)
        cache_key = build_search_cache_key(keyword)
        
        # Increment version
        r.incr(version_key)
        
        # Delete old cache
        r.delete(cache_key)
    except Exception as e:
        logger.error(f"Redis bump cache version error: {e}")

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

def set_cached_search_result(keyword: str, data: dict, expected_version: int) -> None:
    try:
        r = get_redis_client()
        version_key = build_search_cache_version_key(keyword)
        cache_key = build_search_cache_key(keyword)
        
        current_version = r.get(version_key)
        current_version_int = int(current_version) if current_version is not None else 0
        
        if current_version_int == expected_version:
            r.setex(cache_key, CACHE_TTL, json.dumps(data, ensure_ascii=False))
        else:
            logger.info(f"Skipping cache set for '{keyword}' due to version mismatch: {expected_version} vs {current_version_int}")
    except Exception as e:
        logger.error(f"Redis set cache error: {e}")