import pytest
from backend.app.services.text_matching_service import TextMatchingService

@pytest.fixture
def matching_service():
    return TextMatchingService()

def test_classify_accessory(matching_service):
    accessories = [
        "Ví da cho iPhone 15 Pro",
        "Ốp lưng iPhone 15 chống sốc",
        "Bao da MagSafe cho iPhone 15 Pro Max",
        "Kính cường lực iPhone 15",
        "Miếng dán màn hình Samsung Galaxy A55",
        "Miếng dán camera iPhone 15 Pro",
        "Đế giữ điện thoại kiêm sạc không dây Baseus",
        "Giá đỡ điện thoại livestream",
        "Dây đeo điện thoại Zagg",
        "Vòng giữ điện thoại UAG Magnetic",
        "Ốp da kèm ví đựng thẻ cho iPhone 15"
    ]
    
    for item in accessories:
        norm = matching_service._normalize_text(item)
        is_acc = matching_service._is_accessory(norm)
        ptype = matching_service._classify_product_type(norm, is_acc)
        assert ptype == "accessory", f"Failed for accessory: {item}"

def test_classify_phone(matching_service):
    phones = [
        "Apple iPhone 15 128GB chính hãng VN/A",
        "Điện thoại Apple iPhone 15 128GB",
        "iPhone 15 Pro Max 256GB",
        "Samsung Galaxy A55 5G 128GB",
        "Điện thoại Nokia 3210 4G",
        "Điện thoại Itel it9310"
    ]
    
    for item in phones:
        norm = matching_service._normalize_text(item)
        is_acc = matching_service._is_accessory(norm)
        ptype = matching_service._classify_product_type(norm, is_acc)
        assert ptype == "phone", f"Failed for phone: {item}"

def test_group_products_different_type(matching_service):
    items = [
        {"maSPTho": 1, "tenSanPham": "Apple iPhone 15 128GB VN/A", "sanTMDT": "Tiki"},
        {"maSPTho": 2, "tenSanPham": "Điện thoại iPhone 15 128GB chính hãng", "sanTMDT": "Lazada"},
        {"maSPTho": 3, "tenSanPham": "Ví da cho iPhone 15", "sanTMDT": "Shopee"},
        {"maSPTho": 4, "tenSanPham": "Kính cường lực iPhone 15", "sanTMDT": "Tiki"}
    ]
    
    groups = matching_service.group_products(items)
    
    for group in groups:
        product_type = group["productType"]
        for item in group["items"]:
            norm = matching_service._normalize_text(item["tenSanPham"])
            is_acc = matching_service._is_accessory(norm)
            ptype = matching_service._classify_product_type(norm, is_acc)
            assert ptype == product_type, f"Mismatched type {ptype} vs {product_type} for {item['tenSanPham']}"
