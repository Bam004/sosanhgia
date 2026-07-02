import json
import re
import unicodedata
from datetime import datetime
from urllib.parse import urlencode, urljoin

import scrapy

from scrapers.items import SanPhamThoItem


class TikiSpider(scrapy.Spider):
    name = "tiki"
    allowed_domains = ["tiki.vn"]

    api_url = "https://tiki.vn/api/v2/products"

    custom_settings = {
        "ROBOTSTXT_OBEY": False,
        "DOWNLOAD_DELAY": 1,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "FEED_EXPORT_ENCODING": "utf-8",
        "DOWNLOAD_TIMEOUT": 20,
        "RETRY_TIMES": 1,
        "CLOSESPIDER_TIMEOUT": 180,
    }

    ACCESSORY_KEYWORDS = [
        "op lung",
        "kinh cuong luc",
        "kinh camera",
        "camera lens",
        "lens camera",
        "lens",
        "cuong luc",
        "mieng dan",
        "dan man hinh",
        "bao da",
        "case",
        "cover",
        "cap sac",
        "cu sac",
        "sac nhanh",
        "adapter",
        "tai nghe",
        "day deo",
        "esr",
        "pisen",
    ]

    def __init__(self, keyword=None, max_pages=1, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.keyword = self.normalize_keyword(keyword)
        self.max_pages = int(max_pages)

        if not self.keyword:
            raise ValueError(
                'Missing keyword. Example: python -m scrapy crawl tiki -a keyword="iphone 15" -O tiki_iphone15.json'
            )

    async def start(self):
        self.logger.info("Tiki keyword: %s", self.keyword)
        yield self.build_request(page=1)

    def build_request(self, page):
        params = {
            "limit": 20,
            "include": "advertisement",
            "aggregations": 2,
            "q": self.keyword,
            "page": page,
        }

        url = self.api_url + "?" + urlencode(params)

        return scrapy.Request(
            url=url,
            method="GET",
            headers={
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0",
                "Referer": f"https://tiki.vn/search?q={self.keyword.replace(' ', '%20')}",
            },
            callback=self.parse_api,
            cb_kwargs={"page": page},
            dont_filter=True,
        )

    def parse_api(self, response, page):
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            self.logger.error("Tiki API response is not valid JSON")
            return

        products = data.get("data", []) or []
        self.logger.info("Tiki page %s: API returned %s products", page, len(products))

        total_valid = 0

        for product in products:
            if not self.is_target_product(product):
                continue

            item = self.product_to_item(product)

            if item["tenSanPham"] and item["giaHienTai"] and item["linkGoc"]:
                total_valid += 1
                yield item

        self.logger.info("Tiki page %s: accepted keyword-related products = %s", page, total_valid)

        if page < self.max_pages and products:
            yield self.build_request(page=page + 1)

    def product_to_item(self, product):
        name = self.clean_text(product.get("name"))
        price = self.parse_price(product.get("price"))

        url_path = product.get("url_path") or ""
        link = urljoin("https://tiki.vn/", url_path)

        item = SanPhamThoItem()
        item["tenSanPham"] = name
        item["sanTMDT"] = "Tiki"
        item["giaHienTai"] = price
        item["linkGoc"] = link
        item["hinhAnh"] = self.fix_image_url(product.get("thumbnail_url"))
        item["danhGia"] = self.parse_rating(product.get("rating_average"))
        item["soLuongDanhGia"] = self.parse_int(product.get("review_count")) or 0
        item["attributes"] = {
            "nguon": "tiki",
            "keyword": self.keyword,
            "product_id": product.get("id"),
            "url_path": product.get("url_path"),
            "brand_name": product.get("brand_name"),
            "giaGoc": self.parse_price(product.get("original_price")),
            "loai": "api-v2-products",
            "boLoc": "keyword + remove common accessory results",
        }
        item["ngayCapNhat"] = datetime.now().isoformat()

        return item

    def is_target_product(self, product):
        name = self.clean_text(product.get("name"))
        price = self.parse_price(product.get("price"))

        if not name or not price:
            return False

        normalized_keyword = self.normalize_match_text(self.keyword)
        normalized_name = self.normalize_match_text(name)

        if self.is_phone_keyword(normalized_keyword):
            keyword_phrase = self.extract_phone_keyword_phrase(normalized_keyword)

            if not keyword_phrase or keyword_phrase not in normalized_name:
                return False

            if not self.keyword_requests_accessory(normalized_keyword):
                if self.contains_accessory_keyword(normalized_name):
                    return False

            return True

        tokens = self.keyword_tokens(normalized_keyword)

        if not tokens:
            return True

        matched_tokens = sum(1 for token in tokens if token in normalized_name)
        return matched_tokens >= min(2, len(tokens))

    def is_phone_keyword(self, normalized_keyword):
        return bool(re.search(r"\biphone\b|\bsamsung\b|\bgalaxy\b|\boppo\b|\bxiaomi\b", normalized_keyword))

    def extract_phone_keyword_phrase(self, normalized_keyword):
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

    def keyword_requests_accessory(self, normalized_keyword):
        return self.contains_accessory_keyword(normalized_keyword)

    def contains_accessory_keyword(self, normalized_text):
        return any(keyword in normalized_text for keyword in self.ACCESSORY_KEYWORDS)

    def keyword_tokens(self, normalized_keyword):
        stopwords = {"hang", "chinh", "hang chinh hang", "dien", "thoai", "may", "cai", "cho"}
        tokens = re.findall(r"[a-z0-9]+", normalized_keyword)

        return [
            token for token in tokens
            if len(token) >= 2 and token not in stopwords
        ]

    def normalize_keyword(self, text):
        text = self.clean_text(text)

        if not text:
            return None

        text = re.sub(r"(iphone)\s*(\d+)", r"\1 \2", text, flags=re.IGNORECASE)
        return self.clean_text(text)

    def clean_text(self, text):
        if not text:
            return None

        return re.sub(r"\s+", " ", str(text)).strip()

    def normalize_match_text(self, text):
        if not text:
            return ""

        text = str(text).lower()
        text = unicodedata.normalize("NFD", text)
        text = "".join(
            char for char in text
            if unicodedata.category(char) != "Mn"
        )
        text = text.replace("đ", "d")

        text = re.sub(r"[/\-_,.()+|\"'“”]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        return text

    def parse_price(self, value):
        if value is None:
            return None

        if isinstance(value, (int, float)):
            return int(value)

        text = str(value).strip()

        try:
            return int(float(text))
        except ValueError:
            pass

        digits = re.sub(r"[^\d]", "", text)

        if not digits:
            return None

        return int(digits)

    def parse_int(self, value):
        parsed = self.parse_price(value)
        return parsed

    def parse_rating(self, value):
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def fix_image_url(self, image_url):
        if not image_url:
            return None

        image_url = str(image_url).strip()

        if image_url.startswith("http"):
            return image_url

        if image_url.startswith("//"):
            return "https:" + image_url

        return urljoin("https://tiki.vn/", image_url)


