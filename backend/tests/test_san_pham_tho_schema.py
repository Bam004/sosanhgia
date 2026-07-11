import pytest
from backend.app.schemas.san_pham_tho import SanPhamThoBase, SanPhamThoBulkCreate

def test_san_pham_tho_base_accepts_seller():
    # 1. Chấp nhận sellerName, sellerRating
    schema = SanPhamThoBase(
        tenSanPham="Test",
        sanTMDT="Test",
        giaHienTai=1000,
        linkGoc="http://test",
        sellerName="Tiki Trading",
        sellerRating=4.8
    )
    assert schema.sellerName == "Tiki Trading"
    assert schema.sellerRating == 4.8

def test_san_pham_tho_base_accepts_none_seller():
    # 2. Chấp nhận None
    schema = SanPhamThoBase(
        tenSanPham="Test",
        sanTMDT="Test",
        giaHienTai=1000,
        linkGoc="http://test",
        sellerName=None,
        sellerRating=None
    )
    assert schema.sellerName is None
    assert schema.sellerRating is None

def test_bulk_create_camel_case():
    # 3. CamelCase đúng
    data = {
        "tenSanPham": "Test",
        "sanTMDT": "Test",
        "giaHienTai": 1000,
        "linkGoc": "http://test",
        "sellerName": "Tiki Trading",
        "sellerRating": 4.8
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.sellerName == "Tiki Trading"
    assert schema.sellerRating == 4.8

def test_bulk_create_snake_case():
    # 4. Snake_case map sang camelCase
    data = {
        "tenSanPham": "Test",
        "sanTMDT": "Test",
        "giaHienTai": 1000,
        "linkGoc": "http://test",
        "seller_name": "Tiki Trading",
        "seller_rating": 4.8
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.sellerName == "Tiki Trading"
    assert schema.sellerRating == 4.8

def test_bulk_create_priority_seller_name():
    # 5. CamelCase ưu tiên
    data = {
        "tenSanPham": "Test",
        "sanTMDT": "Test",
        "giaHienTai": 1000,
        "linkGoc": "http://test",
        "sellerName": "Seller Camel",
        "seller_name": "Seller Snake"
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.sellerName == "Seller Camel"

def test_bulk_create_priority_seller_rating():
    # 6. CamelCase ưu tiên
    data = {
        "tenSanPham": "Test",
        "sanTMDT": "Test",
        "giaHienTai": 1000,
        "linkGoc": "http://test",
        "sellerRating": 4.9,
        "seller_rating": 3.5
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.sellerRating == 4.9

def test_bulk_create_no_seller():
    # 7. Thiếu dữ liệu seller vẫn OK
    data = {
        "tenSanPham": "Test",
        "sanTMDT": "Test",
        "giaHienTai": 1000,
        "linkGoc": "http://test",
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.sellerName is None
    assert schema.sellerRating is None

def test_bulk_create_danh_gia_does_not_flow_into_seller_rating():
    # 8. danhGia không vào sellerRating
    data = {
        "tenSanPham": "Test",
        "sanTMDT": "Test",
        "giaHienTai": 1000,
        "linkGoc": "http://test",
        "danhGia": 4.5
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.rating == 4.5
    assert schema.sellerRating is None

def test_bulk_create_old_mapping():
    # 9. Mapping cũ hoạt động
    data = {
        "raw_title": "Old title",
        "merchant_name": "Shopee",
        "current_price": 500,
        "origin_url": "http://old",
        "image_url": "img",
        "review_count": 10
    }
    schema = SanPhamThoBulkCreate(**data)
    assert schema.tenSanPham == "Old title" or schema.raw_title == "Old title"
    assert schema.sanTMDT == "Shopee" or schema.merchant_name == "Shopee"
    assert schema.giaHienTai == 500 or schema.current_price == 500
    assert schema.linkGoc == "http://old" or schema.origin_url == "http://old"
    assert schema.image_url == "img"
    assert schema.review_count == 10
