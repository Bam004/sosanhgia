import pytest
import math
from fastapi import status
from backend.app.models import SanPhamTho

def get_db_item(db_session, maSPTho):
    return db_session.query(SanPhamTho).filter(SanPhamTho.maSPTho == maSPTho).first()

def test_bulk_seller_camelcase(client, db_session):
    payload = [{
        "tenSanPham": "Test Camel",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/camel",
        "sellerName": "Tiki Trading",
        "sellerRating": 4.8
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert item.sellerName == "Tiki Trading"
    assert float(item.sellerRating) == 4.8

def test_bulk_seller_snakecase(client, db_session):
    payload = [{
        "tenSanPham": "Test Snake",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/snake",
        "seller_name": "Tiki Trading",
        "seller_rating": 4.7
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert item.sellerName == "Tiki Trading"
    assert float(item.sellerRating) == 4.7

def test_bulk_seller_both_priority(client, db_session):
    payload = [{
        "tenSanPham": "Test Both",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/both",
        "sellerName": "Camel Name",
        "seller_name": "Snake Name",
        "sellerRating": 4.9,
        "seller_rating": 4.1
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert item.sellerName == "Camel Name"
    assert float(item.sellerRating) == 4.9

def test_bulk_no_seller(client, db_session):
    payload = [{
        "tenSanPham": "Test No Seller",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/no_seller"
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert item.sellerName is None
    assert item.sellerRating is None

def test_bulk_seller_name_whitespace(client, db_session):
    payload = [{
        "tenSanPham": "Test WS",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/ws",
        "sellerName": "  Tiki Trading  "
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert item.sellerName == "Tiki Trading"

def test_bulk_seller_name_only_whitespace(client, db_session):
    payload = [{
        "tenSanPham": "Test Only WS",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/only_ws",
        "sellerName": "   "
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert item.sellerName is None

def test_bulk_seller_rating_nan_infinity(client, db_session):
    # Depending on how FastAPI parses NaN/Inf, it could be 422 or pass.
    # In either case, it shouldn't save non-finite to DB.
    payload = [{
        "tenSanPham": "Test NaN",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/nan",
        "sellerRating": "NaN"
    }]
    resp = client.post("/api/items/bulk", json=payload)
    if resp.status_code == 201:
        item = get_db_item(db_session, resp.json()["ids"][0])
        assert item.sellerRating is None
    else:
        assert resp.status_code == 422

    payload = [{
        "tenSanPham": "Test Inf",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/inf",
        "sellerRating": "Infinity"
    }]
    resp = client.post("/api/items/bulk", json=payload)
    if resp.status_code == 201:
        item = get_db_item(db_session, resp.json()["ids"][0])
        assert item.sellerRating is None
    else:
        assert resp.status_code == 422

def test_bulk_product_rating_independence(client, db_session):
    payload = [{
        "tenSanPham": "Test Indep",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/indep",
        "rating": 4.6,
        "sellerRating": 4.9
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert float(item.danhGia) == 4.6
    assert float(item.sellerRating) == 4.9

def test_bulk_product_rating_no_seller(client, db_session):
    payload = [{
        "tenSanPham": "Test Prod Rating No Seller",
        "sanTMDT": "Tiki",
        "giaHienTai": 10000,
        "linkGoc": "http://test.local/prod_rating",
        "rating": 4.6
    }]
    resp = client.post("/api/items/bulk", json=payload)
    assert resp.status_code == 201
    
    item = get_db_item(db_session, resp.json()["ids"][0])
    assert float(item.danhGia) == 4.6
    assert item.sellerRating is None
