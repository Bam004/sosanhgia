import re
import scrapy
from datetime import datetime
from urllib.parse import quote_plus

from scrapers.items import SanPhamThoItem


class FptshopSpider(scrapy.Spider):
    name = "fptshop"
    allowed_domains = ["fptshop.com.vn"]

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "FEED_EXPORT_ENCODING": "utf-8",
        "DOWNLOAD_TIMEOUT": 20,
        "RETRY_TIMES": 1,
        "CLOSESPIDER_TIMEOUT": 180,
    }

    def __init__(self, keyword=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.keyword = self.clean_text(keyword)

        if not self.keyword:
            raise ValueError(
                "Thiếu keyword. Hãy chạy: "
                'python -m scrapy crawl fptshop -a keyword="iphone 15" -O fptshop_iphone15.json'
            )

    async def start(self):
        search_url = f"https://fptshop.com.vn/tim-kiem?s={quote_plus(self.keyword)}"

        self.logger.info(f"Từ khóa tìm kiếm FPT Shop: {self.keyword}")
        self.logger.info(f"URL tìm kiếm FPT Shop: {search_url}")

        yield scrapy.Request(
            url=search_url,
            callback=self.parse_search_results
        )

    def parse_search_results(self, response):
        self.logger.info(f"Đang cào trang kết quả tìm kiếm: {response.url}")
        self.logger.info(f"Status code: {response.status}")

        product_links = response.css("a[href*='/dien-thoai/']::attr(href)").getall()
        seen_links = set()

        for link in product_links:
            full_url = response.urljoin(link).split("?")[0].rstrip("/")

            if full_url in seen_links:
                continue

            if self.is_invalid_product_url(full_url):
                continue

            seen_links.add(full_url)

            yield scrapy.Request(
                url=full_url,
                callback=self.parse_product_detail
            )

    def parse_product_detail(self, response):
        self.logger.info(f"Đang cào chi tiết sản phẩm: {response.url}")

        page_text = " ".join(response.css("body *::text").getall())

        if self.is_listing_page(response, page_text):
            self.logger.warning(f"Bỏ qua trang danh mục/listing: {response.url}")
            return

        ten_san_pham = self.clean_text(
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )

        hinh_anh = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("img::attr(src)").get()
        )

        gia_hien_tai = self.extract_price(response, page_text)

        item = SanPhamThoItem()
        item["tenSanPham"] = ten_san_pham
        item["sanTMDT"] = "FPT Shop"
        item["giaHienTai"] = gia_hien_tai
        item["linkGoc"] = response.url
        item["hinhAnh"] = response.urljoin(hinh_anh) if hinh_anh else None
        item["danhGia"] = None
        item["soLuongDanhGia"] = 0
        item["attributes"] = {
            "nguon": "fptshop",
            "keyword": self.keyword,
            "loai": "tim-kiem"
        }
        item["ngayCapNhat"] = datetime.now().isoformat()

        if item["tenSanPham"] and item["giaHienTai"] and item["linkGoc"]:
            yield item
        else:
            self.logger.warning(
                f"Bỏ qua sản phẩm thiếu tên, giá hoặc link: {response.url}"
            )

    def is_invalid_product_url(self, url):
        invalid_paths = {
            "https://fptshop.com.vn/dien-thoai",
            "https://fptshop.com.vn/dien-thoai/ai",
            "https://fptshop.com.vn/dien-thoai/iphone",
            "https://fptshop.com.vn/dien-thoai/samsung",
            "https://fptshop.com.vn/dien-thoai/oppo",
            "https://fptshop.com.vn/dien-thoai/xiaomi",
            "https://fptshop.com.vn/dien-thoai/vivo",
            "https://fptshop.com.vn/dien-thoai/realme",
            "https://fptshop.com.vn/dien-thoai/nokia",
        }

        if url in invalid_paths:
            return True

        return False

    def is_listing_page(self, response, page_text):
        if re.search(r"Tìm thấy\s+\d+\s+kết quả", page_text):
            return True

        if response.css("button::text").re_first(r"Dùng bộ lọc|Bộ lọc"):
            return True

        return False

    def clean_text(self, text):
        if not text:
            return None
        return re.sub(r"\s+", " ", text).strip()

    def extract_price(self, response, page_text):
        price_candidates = [
            response.css("#price-product span.h4-bold::text").get(),
            response.css("#price-product span.text-black-opacity-100::text").get(),
            response.css("#price-product span::text").re_first(
                r"\d{1,3}(?:\.\d{3})+đ"
            ),
        ]

        for price_text in price_candidates:
            price = self.parse_price(price_text)
            if price:
                return price

        matches = re.findall(r"\d{1,3}(?:\.\d{3})+đ", page_text or "")

        if not matches:
            return None

        return self.parse_price(matches[0])

    def parse_price(self, price_text):
        if not price_text:
            return None

        match = re.search(r"\d{1,3}(?:\.\d{3})+đ", price_text)

        if not match:
            return None

        price_number = match.group().replace(".", "").replace("đ", "")

        try:
            return int(price_number)
        except ValueError:
            return None
