import pytest
from scrapy.http import HtmlResponse, Request

from scrapers.spiders.cellphones_spider import CellphonesSpider
from scrapers.spiders.fptshop_spider import FptshopSpider
from scrapers.spiders.hoanghamobile_spider import HoangHaMobileSpider
from scrapers.spiders.tiki_spider import TikiSpider
from scrapers.lazada_playwright_runner import parse_products

def test_cellphones_mapping():
    spider = CellphonesSpider(keyword="iphone")
    product = {
        "name": "iPhone 15",
        "price": 20000,
        "thumbnail": "img.jpg",
        "url_path": "iphone-15.html"
    }
    item = spider.product_to_item(product)
    
    assert item["sellerName"] == "CellphoneS"
    assert item["sellerRating"] is None
    assert item["sanTMDT"] == "CellPhoneS"
    assert item["tenSanPham"] == "iPhone 15"

def test_tiki_mapping_with_seller():
    spider = TikiSpider(keyword="iphone")
    product = {
        "name": "iPhone 15",
        "price": 20000,
        "seller_name": "Tiki Trading",
        "rating_average": 4.7
    }
    item = spider.product_to_item(product)
    
    assert item["sellerName"] == "Tiki Trading"
    assert item["sellerRating"] is None
    assert item["sanTMDT"] == "Tiki"
    assert item["danhGia"] == 4.7

def test_tiki_mapping_without_seller():
    spider = TikiSpider(keyword="iphone")
    product = {
        "name": "iPhone 15",
        "price": 20000
    }
    item = spider.product_to_item(product)
    
    assert item["sellerName"] is None
    assert item["sellerRating"] is None

def test_tiki_mapping_empty_seller():
    spider = TikiSpider(keyword="iphone")
    product = {
        "name": "iPhone 15",
        "price": 20000,
        "seller_name": ""
    }
    item = spider.product_to_item(product)
    
    assert item["sellerName"] == ""  # DataSync will handle it
    assert item["sellerRating"] is None

def test_lazada_mapping():
    html = """
    <html>
        <body>
            <div data-qa-locator="product-item">
                <a title="iPhone 15" href="/products/iphone-15.html"></a>
                <div>15.000.000 ₫</div>
                <img src="img.jpg" />
                <div>(150)</div>
            </div>
        </body>
    </html>
    """
    products = parse_products(html, "iphone", 1)
    assert len(products) == 1
    
    item = products[0]
    assert item["sellerName"] is None
    assert item["sellerRating"] is None
    assert item["sanTMDT"] == "Lazada"
    assert item["soLuongDanhGia"] == 150

def test_fptshop_mapping(monkeypatch):
    spider = FptshopSpider(keyword="iphone")
    
    # Mock complex extraction logic to focus on mapping
    monkeypatch.setattr(spider, "is_listing_page", lambda r, t: False)
    monkeypatch.setattr(spider, "extract_price", lambda r, t, n: 20000)
    monkeypatch.setattr(spider, "is_keyword_related_product", lambda n: True)
    
    html = "<html><head><title>iPhone 15</title></head><body></body></html>"
    request = Request(url="https://fptshop.com.vn/dien-thoai/iphone-15")
    response = HtmlResponse(url="https://fptshop.com.vn/dien-thoai/iphone-15", body=html, encoding="utf-8", request=request)
    
    items = list(spider.parse_product_detail(response))
    assert len(items) == 1
    
    item = items[0]
    assert item["sellerName"] == "FPT Shop"
    assert item["sellerRating"] is None
    assert item["sanTMDT"] == "FPT Shop"
    assert item["tenSanPham"] == "iPhone 15"

def test_hoangha_mapping(monkeypatch):
    spider = HoangHaMobileSpider(keyword="iphone")
    
    # Mock extraction logic
    monkeypatch.setattr(spider, "is_keyword_related_product", lambda n: True)
    
    html = "<html><body></body></html>"
    request = Request(url="https://hoanghamobile.com/iphone-15", meta={
        "fallback_title": "iPhone 15",
        "fallback_price": 20000,
        "fallback_image": "img.jpg"
    })
    response = HtmlResponse(url="https://hoanghamobile.com/iphone-15", body=html, encoding="utf-8", request=request)
    
    items = list(spider.parse_product_detail(response))
    assert len(items) == 1
    
    item = items[0]
    assert item["sellerName"] == "Hoàng Hà Mobile"
    assert item["sellerRating"] is None
    assert item["sanTMDT"] == "Hoàng Hà Mobile"
    assert item["tenSanPham"] == "iPhone 15"
