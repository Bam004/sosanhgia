import re
import unicodedata
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

    def __init__(self, keyword=None, limit=20, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.keyword = self.clean_text(keyword)
        self.limit = int(limit)

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

        candidates = []
        seen_links = set()

        product_anchors = response.css("a[href]")

        for anchor in product_anchors:
            link = anchor.css("::attr(href)").get()
            title = self.clean_text(
                anchor.css("::attr(title)").get()
                or anchor.css("::attr(aria-label)").get()
                or " ".join(anchor.css("::text").getall())
            )

            if not link or not title:
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
                callback=self.parse_product_detail
            )

        self.logger.info(
            f"FPT Shop: tìm thấy {len(candidates)} sản phẩm khớp keyword, "
            f"ưu tiên và gửi {len(selected_candidates)} request chi tiết"
        )

    def parse_product_detail(self, response):
        self.logger.info(f"Đang cào chi tiết sản phẩm: {response.url}")

        if "iphone-15-plus" in response.url:
            with open("debug_fpt_iphone15_plus.html", "w", encoding="utf-8") as file:
                file.write(response.text)

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

        gia_hien_tai = self.extract_price(response, page_text, ten_san_pham)

        if not self.is_keyword_related_product(ten_san_pham):
            self.logger.info(
                f"Bỏ qua sản phẩm không khớp keyword '{self.keyword}': {ten_san_pham}"
            )
            return

        if self.is_suspicious_price(gia_hien_tai, ten_san_pham, response.url):
            self.logger.warning(
                f"Bỏ qua sản phẩm có giá bất thường: {ten_san_pham} - {gia_hien_tai} - {response.url}"
            )
            return

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

    def is_valid_product_url(self, url):
        if not url:
            return False

        if not url.startswith("https://fptshop.com.vn/"):
            return False

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
            return False

        invalid_keywords = [
            "/tin-tuc/",
            "/khuyen-mai/",
            "/ho-tro/",
            "/gioi-thieu/",
            "/cua-hang/",
            "/tra-gop/",
            "/sim-so/",
        ]

        if any(keyword in url for keyword in invalid_keywords):
            return False

        path = url.replace("https://fptshop.com.vn", "")

        valid_prefixes = [
            "/dien-thoai/",
            "/phu-kien/",
            "/op-lung/",
            "/mieng-dan/",
            "/sac-cap/",
            "/tai-nghe/",
            "/pin-sac-du-phong/",
        ]

        return any(
            path.startswith(prefix)
            for prefix in valid_prefixes
        )

    def get_candidate_priority(self, title, url):
        keyword_is_accessory = self.is_accessory_text(self.keyword)
        candidate_is_accessory = self.is_accessory_text(title) or self.is_accessory_url(url)
        candidate_is_phone = self.is_phone_url(url)

        if keyword_is_accessory:
            if candidate_is_accessory:
                return 0
            if candidate_is_phone:
                return 1
            return 2

        if candidate_is_phone:
            return 0

        if candidate_is_accessory:
            return 1

        return 2

    def is_phone_url(self, url):
        path = url.replace("https://fptshop.com.vn", "")

        return path.startswith("/dien-thoai/")

    def is_accessory_url(self, url):
        path = url.replace("https://fptshop.com.vn", "")

        accessory_prefixes = [
            "/phu-kien/",
            "/op-lung/",
            "/mieng-dan/",
            "/sac-cap/",
            "/tai-nghe/",
            "/pin-sac-du-phong/",
        ]

        return any(
            path.startswith(prefix)
            for prefix in accessory_prefixes
        )

    def is_suspicious_price(self, price, product_name, url):
        if price is None:
            return True

        normalized_text = self.normalize_keyword_match_text(
            f"{product_name or ''} {url or ''}"
        )

        phone_keywords = [
            "iphone",
            "xiaomi",
            "redmi",
            "samsung",
            "galaxy",
            "oppo",
            "vivo",
            "realme",
            "nokia",
        ]

        is_phone_product = (
            self.is_phone_url(url)
            or any(keyword in normalized_text for keyword in phone_keywords)
        )

        if is_phone_product and price < 1000000:
            return True

        if price <= 0:
            return True

        return False

    def is_accessory_text(self, text):
        normalized_text = self.normalize_keyword_match_text(text)

        accessory_patterns = [
            r"\bop\s+lung\b",
            r"\bmieng\s+dan\b",
            r"\bdan\s+kinh\b",
            r"\bdan\s+man\s+hinh\b",
            r"\bkinh\s+dan\b",
            r"\bcuong\s+luc\b",
            r"\bmdmh\b",
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

        text = re.sub(r"([a-z])(\d)", r"\1 \2", text)
        text = re.sub(r"(\d)([a-z])", r"\1 \2", text)

        text = re.sub(r"\s+", " ", text)

        return text.strip()

    def extract_price(self, response, page_text, product_name=None):
        price_from_next_data = self.extract_price_from_next_data(response, product_name)

        if price_from_next_data:
            return price_from_next_data

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

        return None

    def extract_price_from_next_data(self, response, product_name=None):
        html = response.text

        if product_name:
            escaped_name = re.escape(product_name)

            name_patterns = [
                r'\\"displayName\\"\s*:\s*\\"' + escaped_name + r'\\"',
                r'\\"name\\"\s*:\s*\\"' + escaped_name + r'\\"',
                r'\\"shortDisplayName\\"\s*:\s*\\"' + escaped_name + r'\\"',
            ]

            for pattern in name_patterns:
                name_match = re.search(pattern, html)

                if not name_match:
                    continue

                product_segment = html[
                    name_match.start():name_match.start() + 12000
                ]

                current_price_match = re.search(
                    r'\\"currentPrice\\"\s*:\s*(\d+)',
                    product_segment
                )

                if current_price_match:
                    return int(current_price_match.group(1))

                final_price_match = re.search(
                    r'\\"finalPrice\\"\s*:\s*(\d+)',
                    product_segment
                )

                if final_price_match:
                    return int(final_price_match.group(1))

        path = response.url.replace("https://fptshop.com.vn/", "")
        path = path.split("?")[0].strip("/")

        full_slug_pattern = (
            r'\\"fullSlug\\"\s*:\s*\\"'
            + re.escape(path)
            + r'\\"'
        )

        full_slug_match = re.search(full_slug_pattern, html)

        if not full_slug_match:
            return None

        product_data_segment = html[
            max(0, full_slug_match.start() - 30000):full_slug_match.start()
        ]

        current_price_matches = re.findall(
            r'\\"currentPrice\\"\s*:\s*(\d+)',
            product_data_segment
        )

        if current_price_matches:
            return int(current_price_matches[-1])

        final_price_matches = re.findall(
            r'\\"finalPrice\\"\s*:\s*(\d+)',
            product_data_segment
        )

        if final_price_matches:
            return int(final_price_matches[-1])

        return None

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
