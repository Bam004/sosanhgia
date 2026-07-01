# -*- coding: utf-8 -*-

import json
import re
import scrapy
from datetime import datetime
from urllib.parse import quote_plus

from scrapers.items import SanPhamThoItem


class HoangHaMobileSpider(scrapy.Spider):
    name = "hoanghamobile"
    allowed_domains = ["hoanghamobile.com"]

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "FEED_EXPORT_ENCODING": "utf-8",
        "DOWNLOAD_TIMEOUT": 20,
        "RETRY_TIMES": 1,
        "CLOSESPIDER_TIMEOUT": 180,
    }

    def __init__(self, keyword=None, limit=20, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.keyword = self.clean_text(keyword)
        self.limit = int(limit)

        if not self.keyword:
            raise ValueError(
                "Thiếu keyword. Hãy chạy: "
                'python -m scrapy crawl hoanghamobile -a keyword="iphone 17" -O hoanghamobile_iphone17.json'
            )

    async def start(self):
        search_url = f"https://hoanghamobile.com/tim-kiem?kwd={quote_plus(self.keyword)}"

        self.logger.info(f"Từ khóa tìm kiếm Hoàng Hà Mobile: {self.keyword}")
        self.logger.info(f"URL tìm kiếm Hoàng Hà Mobile: {search_url}")

        yield scrapy.Request(
            url=search_url,
            callback=self.parse_search_results
        )

    def parse_search_results(self, response):
        self.logger.info(f"Đang cào trang kết quả tìm kiếm: {response.url}")
        self.logger.info(f"Status code: {response.status}")

        product_links = response.css("a[href*='/dien-thoai/']::attr(href)").getall()

        seen_links = set()
        total_requests = 0

        for link in product_links:
            full_url = response.urljoin(link.replace("&amp;", "&"))
            full_url = full_url.split("?")[0].rstrip("/")

            if full_url in seen_links:
                continue

            if not self.is_valid_product_url(full_url):
                continue

            seen_links.add(full_url)

            if total_requests >= self.limit:
                break

            total_requests += 1

            yield scrapy.Request(
                url=full_url,
                callback=self.parse_product_detail
            )

        self.logger.info(
            f"Hoàng Hà Mobile: tìm thấy {len(seen_links)} link sản phẩm hợp lệ, "
            f"đã gửi {total_requests} request chi tiết"
        )

    def parse_product_detail(self, response):
        self.logger.info(f"Đang cào chi tiết sản phẩm Hoàng Hà Mobile: {response.url}")

        page_text = " ".join(response.css("body *::text").getall())
        structured_data = self.extract_structured_product_data(response)

        ten_san_pham = self.clean_text(
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )

        hinh_anh = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("img::attr(src)").get()
        )

        link_goc = (
            response.css("link[rel='canonical']::attr(href)").get()
            or response.url
        )

        gia_hien_tai = self.extract_price(response, page_text, structured_data)
        danh_gia = self.extract_rating(structured_data)
        so_luong_danh_gia = self.extract_review_count(structured_data)

        item = SanPhamThoItem()
        item["tenSanPham"] = ten_san_pham
        item["sanTMDT"] = "Hoàng Hà Mobile"
        item["giaHienTai"] = gia_hien_tai
        item["linkGoc"] = response.urljoin(link_goc) if link_goc else response.url
        item["hinhAnh"] = response.urljoin(hinh_anh) if hinh_anh else None
        item["danhGia"] = danh_gia
        item["soLuongDanhGia"] = so_luong_danh_gia
        item["attributes"] = {
            "nguon": "hoanghamobile",
            "keyword": self.keyword,
            "loai": "tim-kiem",
            "brand": self.extract_brand(structured_data),
            "sku": structured_data.get("sku") if isinstance(structured_data, dict) else None,
            "availability": self.extract_availability(structured_data),
            "priceValidUntil": self.extract_price_valid_until(structured_data),
        }
        item["ngayCapNhat"] = datetime.now().isoformat()

        if item["tenSanPham"] and item["giaHienTai"] and item["linkGoc"]:
            yield item
        else:
            self.logger.warning(
                f"Bỏ qua sản phẩm thiếu tên, giá hoặc link: {response.url}"
            )

    def is_valid_product_url(self, url):
        if not url:
            return False

        if "/tra-gop/" in url:
            return False

        if "/dien-thoai-di-dong/" in url:
            return False

        if not re.match(r"^https://hoanghamobile\.com/dien-thoai/[^/?#]+$", url):
            return False

        return True

    def extract_structured_product_data(self, response):
        scripts = response.css("script[type='application/ld+json']::text").getall()

        for script in scripts:
            script = script.strip()

            if not script:
                continue

            try:
                data = json.loads(script)
            except json.JSONDecodeError:
                continue

            product_data = self.find_product_object(data)

            if product_data:
                return product_data

        return {}

    def find_product_object(self, data):
        if isinstance(data, dict):
            item_type = data.get("@type")

            is_product_type = (
                item_type == "Product"
                or (
                    isinstance(item_type, list)
                    and "Product" in item_type
                )
            )

            if is_product_type or ("offers" in data and "name" in data):
                return data

            for value in data.values():
                found = self.find_product_object(value)

                if found:
                    return found

        if isinstance(data, list):
            for item in data:
                found = self.find_product_object(item)

                if found:
                    return found

        return None

    def extract_price(self, response, page_text, structured_data):
        offers = structured_data.get("offers") if isinstance(structured_data, dict) else None

        if isinstance(offers, list) and offers:
            offers = offers[0]

        if isinstance(offers, dict):
            price = self.parse_price(offers.get("price"))

            if price:
                return price

        json_ld_scripts = response.css("script[type='application/ld+json']::text").getall()
        json_ld_text = " ".join(json_ld_scripts)

        match = re.search(r'"offers"\s*:\s*\{.*?"price"\s*:\s*"?(?P<price>\d+(?:\.\d+)?)"?', json_ld_text, re.S)

        if match:
            price = self.parse_price(match.group("price"))

            if price:
                return price

        match = re.search(r'"price"\s*:\s*(?P<price>\d+(?:\.\d+)?)', page_text or "")

        if match:
            price = self.parse_price(match.group("price"))

            if price:
                return price

        return None

    def extract_rating(self, structured_data):
        aggregate_rating = structured_data.get("aggregateRating") if isinstance(structured_data, dict) else None

        if not isinstance(aggregate_rating, dict):
            return None

        rating_value = aggregate_rating.get("ratingValue")

        if rating_value is None:
            return None

        try:
            return round(float(rating_value), 2)
        except ValueError:
            return None

    def extract_review_count(self, structured_data):
        aggregate_rating = structured_data.get("aggregateRating") if isinstance(structured_data, dict) else None

        if not isinstance(aggregate_rating, dict):
            return 0

        review_count = aggregate_rating.get("reviewCount")

        if review_count is None:
            return 0

        try:
            return int(float(review_count))
        except ValueError:
            return 0

    def extract_brand(self, structured_data):
        brand = structured_data.get("brand") if isinstance(structured_data, dict) else None

        if isinstance(brand, dict):
            return brand.get("name")

        if isinstance(brand, str):
            return brand

        return None

    def extract_availability(self, structured_data):
        offers = structured_data.get("offers") if isinstance(structured_data, dict) else None

        if isinstance(offers, list) and offers:
            offers = offers[0]

        if isinstance(offers, dict):
            return offers.get("availability")

        return None

    def extract_price_valid_until(self, structured_data):
        offers = structured_data.get("offers") if isinstance(structured_data, dict) else None

        if isinstance(offers, list) and offers:
            offers = offers[0]

        if isinstance(offers, dict):
            return offers.get("priceValidUntil")

        return None

    def clean_text(self, text):
        if not text:
            return None

        return re.sub(r"\s+", " ", str(text)).strip()

    def parse_price(self, value):
        if value is None:
            return None

        if isinstance(value, (int, float)):
            return int(float(value))

        text = str(value).strip()

        if re.fullmatch(r"\d+(?:\.\d+)?", text):
            return int(float(text))

        digits = re.sub(r"[^\d]", "", text)

        if not digits:
            return None

        return int(digits)

