import pytest
from unittest.mock import patch, MagicMock
from backend.app.services.search_cache_service import (
    build_search_cache_key,
    build_search_cache_version_key,
    get_search_cache_version,
    bump_search_cache_version,
    set_cached_search_result,
    get_cached_search_result,
)
from backend.app.core.utils import normalize_search_text

def test_normalize_search_text_consistency():
    assert normalize_search_text("iPhone 15") == normalize_search_text(" iphone 15 ")
    assert normalize_search_text("điện thoại") == normalize_search_text("dien thoai")
    
@patch("backend.app.services.search_cache_service.get_redis_client")
def test_cache_versioning_flow(mock_get_redis):
    # Setup mock Redis
    mock_redis = MagicMock()
    mock_get_redis.return_value = mock_redis
    
    # 1. Ban đầu version = 0
    mock_redis.get.return_value = None
    assert get_search_cache_version("iphone") == 0
    
    # 2. Bump version tăng version
    bump_search_cache_version("iphone")
    mock_redis.incr.assert_called_once_with(build_search_cache_version_key("iphone"))
    mock_redis.delete.assert_called_once_with(build_search_cache_key("iphone"))
    
    # 3. SET cache thành công nếu version khớp
    mock_redis.get.return_value = "1"
    set_cached_search_result("iphone", {"data": "test"}, expected_version=1)
    mock_redis.setex.assert_called_once()
    
    # 4. SET cache thất bại (skip) nếu version không khớp
    mock_redis.setex.reset_mock()
    mock_redis.get.return_value = "2" # Đã bị bump bởi request khác
    set_cached_search_result("iphone", {"data": "old"}, expected_version=1)
    mock_redis.setex.assert_not_called()
