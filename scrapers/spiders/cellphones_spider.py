import json
import re
import scrapy
from datetime import datetime
from urllib.parse import urljoin

from scrapers.items import SanPhamThoItem


class CellphonesSpider(scrapy.Spider):
    name = "cellphones"
    allowed_domains = ["cellphones.com.vn", "api.cellphones.com.vn"]

    api_url = "https://api.cellphones.com.vn/graphql-search/v2/graphql/query"

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "FEED_EXPORT_ENCODING": "utf-8",
        "DOWNLOAD_TIMEOUT": 20,
        "RETRY_TIMES": 1,
        "CLOSESPIDER_TIMEOUT": 180,
    }

    def __init__(self, keyword=None, province=30, max_pages=1, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.keyword = self.normalize_keyword(keyword)
        self.province = int(province)
        self.max_pages = int(max_pages)

        if not self.keyword:
            raise ValueError(
                'Missing keyword. Example: python -m scrapy crawl cellphones -a keyword="iphone 15" -O cellphones_iphone15.json'
            )

    async def start(self):
        self.logger.info(f"CellPhoneS keyword: {self.keyword}")
        self.logger.info(f"CellPhoneS province: {self.province}")
        yield self.build_request(page=1)

    def build_request(self, page):
        payload = {
            "query": self.build_graphql_query(page),
            "variables": {}
        }

        return scrapy.Request(
            url=self.api_url,
            method="POST",
            body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0",
                "Origin": "https://cellphones.com.vn",
                "Referer": f"https://cellphones.com.vn/catalogsearch/result?q={self.keyword.replace(' ', '%20')}",
            },
            callback=self.parse_api,
            cb_kwargs={"page": page},
        )

    def build_graphql_query(self, page):
        terms = json.dumps(self.keyword, ensure_ascii=False)

        return f"""
        query advanced_search {{
          advanced_search(
            user_query: {{
              terms: {terms},
              province: {self.province}
            }}
            page: {page}
          ) {{
            products {{
              province_id
              product_id
              name
              sku
              url_path
              price
              prices
              special_price
              stock_available_id
              thumbnail
              promotion_information
              score
              display_price
              display_root_price
            }}
          }}
        }}
        """

    def parse_api(self, response, page):
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            self.logger.error("CellPhoneS API response is not valid JSON")
            return

        products = (
            data.get("data", {})
            .get("advanced_search", {})
            .get("products", [])
        ) or []

        self.logger.info(f"CellPhoneS page {page}: API returned {len(products)} products")

        total_valid = 0

        for product in products:
            if not self.is_target_product(product):
                continue

            item = self.product_to_item(product)

            if item["tenSanPham"] and item["giaHienTai"] and item["linkGoc"]:
                total_valid += 1
                yield item

        self.logger.info(f"CellPhoneS page {page}: accepted keyword-related products = {total_valid}")

        if page < self.max_pages and products:
            yield self.build_request(page=page + 1)

    def product_to_item(self, product):
        name = self.clean_text(product.get("name"))
        price = self.parse_price(
            product.get("display_price")
            or product.get("special_price")
            or product.get("price")
        )

        url_path = product.get("url_path") or ""
        link = urljoin("https://cellphones.com.vn/", url_path)

        item = SanPhamThoItem()
        item["tenSanPham"] = name
        item["sanTMDT"] = "CellPhoneS"
        item["giaHienTai"] = price
        item["linkGoc"] = link
        item["hinhAnh"] = self.fix_image_url(product.get("thumbnail"))
        item["danhGia"] = None
        item["soLuongDanhGia"] = 0
        item["sellerName"] = "CellphoneS"
        item["sellerRating"] = None
        item["attributes"] = {
            "nguon": "cellphones",
            "keyword": self.keyword,
            "province": self.province,
            "product_id": product.get("product_id"),
            "sku": product.get("sku"),
            "url_path": product.get("url_path"),
            "giaGoc": self.parse_price(product.get("display_root_price") or product.get("price")),
            "stock_available_id": product.get("stock_available_id"),
            "prices": product.get("prices"),
            "loai": "graphql-advanced-search",
            "boLoc": "keyword-only, no category filter"
        }
        item["ngayCapNhat"] = datetime.now().isoformat()

        return item

    def is_target_product(self, product):
        """
        Keyword-only mode:
        CellPhoneS API already returns products related to the user's keyword.
        At this stage, the spider only removes invalid rows without product name.
        Category filtering will be handled later if the system supports user-selected categories.
        """
        name = self.clean_text(product.get("name"))
        return bool(name)

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

    def fix_image_url(self, thumbnail):
        if not thumbnail:
            return None

        thumbnail = str(thumbnail).strip()

        if thumbnail.startswith("http"):
            return thumbnail

        if thumbnail.startswith("//"):
            return "https:" + thumbnail

        if thumbnail.startswith("/"):
            return "https://cdn2.cellphones.com.vn/358x/media/catalog/product" + thumbnail

        return urljoin("https://cdn2.cellphones.com.vn/358x/media/catalog/product/", thumbnail)
