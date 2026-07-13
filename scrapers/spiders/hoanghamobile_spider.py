# -*- coding: utf-8 -*-

import json
import re
import unicodedata
import scrapy
from datetime import datetime
from urllib.parse import quote_plus, urlparse

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

    def extract_listing_items_from_script(self, response):
        match = re.search(
            r"window\.insider_object\.listing\s*=\s*(\{.*?\});",
            response.text,
            re.S
        )

        if not match:
            return []

        try:
            listing_data = json.loads(match.group(1))
        except json.JSONDecodeError:
            return []

        items = listing_data.get("items", [])

        if not isinstance(items, list):
            return []

        return items

    def parse_search_results(self, response):
        self.logger.info(f"Đang cào trang kết quả tìm kiếm: {response.url}")
        self.logger.info(f"Status code: {response.status}")

        if "samsung" in self.keyword or "sam sung" in self.keyword:
            with open("debug_hoangha_samsung_a56.html", "w", encoding="utf-8") as file:
                file.write(response.text)

        candidates = []
        seen_links = set()

        listing_items = self.extract_listing_items_from_script(response)

        for listing_item in listing_items:
            title = self.clean_text(listing_item.get("name"))
            link = listing_item.get("url")

            if not title or not link:
                continue

            full_url = response.urljoin(link).split("?")[0].rstrip("/")

            if full_url in seen_links:
                continue

            if not self.is_valid_product_url(full_url):
                continue

            if not self.is_keyword_related_product(title):
                continue

            seen_links.add(full_url)

            candidates.append({
                "url": full_url,
                "title": title,
                "price": self.parse_price(
                    listing_item.get("unit_sale_price")
                    or listing_item.get("unit_price")
                ),
                "image": listing_item.get("product_image_url"),
                "priority": self.get_candidate_priority(title, full_url),
            })

        product_anchors = response.css("a[title][href]")

        for anchor in product_anchors:
            link = anchor.css("::attr(href)").get()
            title = self.clean_text(
                anchor.css("::attr(title)").get()
                or " ".join(anchor.css("::text").getall())
            )

            if not link or not title:
                continue

            full_url = response.urljoin(link.replace("&amp;", "&"))
            full_url = full_url.split("?")[0].rstrip("/")

            if full_url in seen_links:
                continue

            if not self.is_valid_product_url(full_url):
                continue

            if not self.is_keyword_related_product(title):
                continue

            seen_links.add(full_url)

            candidates.append({
                "url": full_url,
                "title": title,
                "priority": self.get_candidate_priority(title, full_url),
            })

        candidates = sorted(
            candidates,
            key=lambda candidate: candidate["priority"]
        )

        selected_candidates = candidates[:self.limit]

        for candidate in selected_candidates:
            yield scrapy.Request(
                url=candidate["url"],
                callback=self.parse_product_detail,
                meta={
                    "fallback_title": candidate.get("title"),
                    "fallback_price": candidate.get("price"),
                    "fallback_image": candidate.get("image"),
                }
            )

        self.logger.info(
            f"Hoàng Hà Mobile: tìm thấy {len(candidates)} sản phẩm khớp keyword, "
            f"ưu tiên và gửi {len(selected_candidates)} request chi tiết"
        )

    def parse_product_detail(self, response):
        self.logger.info(f"Đang cào chi tiết sản phẩm Hoàng Hà Mobile: {response.url}")

        page_text = " ".join(response.css("body *::text").getall())
        structured_data = self.extract_structured_product_data(response)

        fallback_title = self.clean_text(response.meta.get("fallback_title"))
        fallback_price = response.meta.get("fallback_price")
        fallback_image = response.meta.get("fallback_image")

        ten_san_pham = self.clean_text(
            fallback_title
            or response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )

        hinh_anh = (
            response.css("meta[property='og:image']::attr(content)").get()
            or fallback_image
            or response.css("img::attr(src)").get()
        )

        link_goc = (
            response.css("link[rel='canonical']::attr(href)").get()
            or response.url
        )

        gia_hien_tai = (
            self.extract_price(response, page_text, structured_data)
            or fallback_price
        )
        danh_gia = self.extract_rating(structured_data)
        so_luong_danh_gia = self.extract_review_count(structured_data)

        if not self.is_keyword_related_product(ten_san_pham):
            self.logger.info(
                f"Bỏ qua sản phẩm không khớp keyword '{self.keyword}': {ten_san_pham}"
            )
            return

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

        parsed_url = urlparse(url)

        if parsed_url.netloc not in {
            "hoanghamobile.com",
            "www.hoanghamobile.com",
        }:
            return False

        path = parsed_url.path.strip("/")

        if not path:
            return False

        path_segments = [
            segment
            for segment in path.split("/")
            if segment
        ]

        # URL chi tiết sản phẩm thường gồm:
        # /danh-muc/ten-san-pham
        if len(path_segments) < 2:
            return False

        invalid_prefixes = {
            "tim-kiem",
            "tin-tuc",
            "khuyen-mai",
            "tra-gop",
            "gioi-thieu",
            "lien-he",
            "he-thong-cua-hang",
            "bao-hanh",
            "chinh-sach",
            "tai-khoan",
            "gio-hang",
            "thanh-toan",
            "tuyen-dung",
        }

        if path_segments[0].lower() in invalid_prefixes:
            return False

        return True

    def get_candidate_priority(self, title, url):
        keyword_is_accessory = self.is_accessory_text(self.keyword)
        candidate_is_accessory = self.is_accessory_text(title) or self.is_accessory_url(url)
        candidate_is_phone = self.is_phone_url(url)

        # Nếu người dùng tìm phụ kiện, ưu tiên phụ kiện trước.
        if keyword_is_accessory:
            if candidate_is_accessory:
                return 0
            if candidate_is_phone:
                return 1
            return 2

        # Nếu người dùng tìm điện thoại/dòng máy, ưu tiên điện thoại trước.
        if candidate_is_phone and not candidate_is_accessory:
            return 0

        if candidate_is_accessory:
            return 1

        return 2

    def is_phone_url(self, url):
        path = url.replace("https://hoanghamobile.com", "")

        return (
            path.startswith("/dien-thoai/")
            or path.startswith("/dien-thoai-di-dong/")
            or path.startswith("/kho-san-pham-cu/dien-thoai/")
        )

    def is_accessory_url(self, url):
        path = url.replace("https://hoanghamobile.com", "")

        accessory_prefixes = [
            "/op-lung/",
            "/tam-dan-man-hinh/",
            "/thay/",
            "/sac-cap/",
            "/tai-nghe/",
            "/pin-sac-du-phong/",
        ]

        return any(
            path.startswith(prefix)
            for prefix in accessory_prefixes
        )

    def is_accessory_text(self, text):
        normalized_text = self.normalize_keyword_match_text(text)

        accessory_patterns = [
            r"\bop\s+lung\b",
            r"\bdan\s+kinh\b",
            r"\bdan\s+man\s+hinh\b",
            r"\bkinh\s+dan\b",
            r"\bcuong\s+luc\b",
            r"\btam\s+dan\b",
            r"\bthay\s+man\s+hinh\b",
            r"\bcase\b",
            r"\bcover\b",
            r"\bmagsafe\b",
            r"\bsac\b",
            r"\bcap\b",
            r"\btai\s+nghe\b",
            r"\badapter\b",
            r"\bpin\s+du\s+phong\b",
        ]

        return any(
            re.search(pattern, normalized_text)
            for pattern in accessory_patterns
        )

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

    def is_keyword_related_product(self, product_name):
        normalized_keyword = self.normalize_keyword_match_text(self.keyword)
        normalized_product_name = self.normalize_keyword_match_text(product_name)

        keyword_phrase = self.extract_main_keyword_phrase(normalized_keyword)

        if not keyword_phrase:
            return False

        return keyword_phrase in normalized_product_name

    def extract_main_keyword_phrase(self, normalized_keyword):
        iphone_number_match = re.search(
            r"\biphone\s+\d{1,2}(?:\s+(?:pro max|pro|max|plus|e))?",
            normalized_keyword
        )

        if iphone_number_match:
            return iphone_number_match.group(0)

        iphone_x_match = re.search(
            r"\biphone\s+(?:xs max|xr|xs|x|se)",
            normalized_keyword
        )

        if iphone_x_match:
            return iphone_x_match.group(0)

        return normalized_keyword

    def normalize_keyword_match_text(self, text):
        text = self.clean_text(text) or ""
        text = text.lower()
        text = unicodedata.normalize("NFD", text)
        text = "".join(
            char for char in text
            if unicodedata.category(char) != "Mn"
        )
        text = text.replace("đ", "d")

        text = re.sub(r"[/\-_,.()+]", " ", text)

        text = re.sub(
            r"\biphone\s*(\d{1,2})\s*(pro\s*max|pro|max|plus|e)?\b",
            lambda match: self.clean_text(
                f"iphone {match.group(1)} {match.group(2) or ''}"
            ),
            text
        )

        text = re.sub(
            r"\biphone\s*xs\s*max\b",
            "iphone xs max",
            text
        )

        text = re.sub(
            r"\biphone\s*(xr|xs|x|se)\b",
            r"iphone \1",
            text
        )

        text = re.sub(r"\s+", " ", text)

        return text.strip()

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

