import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_search_phone_excludes_accessory(client):
    response = client.get("/api/search", params={"keyword": "iphone 15", "auto_scrape": "false"})
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    groups = data.get("data", {}).get("groups", [])
    
    # Check that all groups are phones
    for group in groups:
        assert group.get("productType") == "phone"
        # Check raw items
        for item in group.get("items", []):
            name = item.get("tenSanPham", "").lower()
            assert "ốp lưng" not in name
            assert "kính cường lực" not in name
            assert "bao da" not in name

def test_search_accessory_only(client):
    response = client.get("/api/search", params={"keyword": "vi da iphone 15", "auto_scrape": "false"})
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    groups = data.get("data", {}).get("groups", [])
    
    for group in groups:
        assert group.get("productType") == "accessory"

def test_search_sources_structure(client):
    response = client.get("/api/search", params={"keyword": "iphone 15", "auto_scrape": "false"})
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    groups = data.get("data", {}).get("groups", [])
    
    if groups:
        group = groups[0]
        # Check new sources format
        sources = group.get("sources", [])
        assert isinstance(sources, list)
        
        # Verify source item schema
        if sources:
            source = sources[0]
            assert "sourceCode" in source
            assert "sourceName" in source
            assert "giaThapNhat" in source
            assert "offerCount" in source
            assert source["giaThapNhat"] > 0
            
            # Count must be accurate
            assert source["offerCount"] > 0
            
        # Check backward compatibility
        assert "soOffer" in group
        assert "nguon" in group
