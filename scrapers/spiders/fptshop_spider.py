import re
import unicodedata
import scrapy
from datetime import datetime
from urllib.parse import quote_plus, urlparse

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

            fallback_price = None
            fallback_image = self.extract_card_image(anchor, response)

            seen_links.add(full_url)

            candidates.append({
                "url": full_url,
                "title": title,
                "price": fallback_price,
                "image": fallback_image,
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
            f"FPT Shop: tìm thấy {len(candidates)} sản phẩm khớp keyword, "
            f"ưu tiên và gửi {len(selected_candidates)} request chi tiết"
        )

    def parse_product_detail(self, response):
        self.logger.info(f"Đang cào chi tiết sản phẩm: {response.url}")

        page_text = " ".join(response.css("body *::text").getall())

        if self.is_listing_page(response, page_text):
            self.logger.warning(f"Bỏ qua trang danh mục/listing: {response.url}")
            return

        fallback_title = self.clean_text(response.meta.get("fallback_title"))
        fallback_price = response.meta.get("fallback_price")
        fallback_image = response.meta.get("fallback_image")

        ten_san_pham = self.clean_text(
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
            or fallback_title
        )

        hinh_anh = (
            response.css("meta[property='og:image']::attr(content)").get()
            or fallback_image
            or response.css("img::attr(src)").get()
        )

        gia_tu_chi_tiet = self.extract_price(response, page_text, ten_san_pham)
        gia_hien_tai = gia_tu_chi_tiet or fallback_price

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
            "loai": "tim-kiem",
            "giaLayTuListing": fallback_price,
            "coGiaTuTrangChiTiet": bool(gia_tu_chi_tiet),
        }
        item["ngayCapNhat"] = datetime.now().isoformat()

        if item["tenSanPham"] and item["giaHienTai"] and item["linkGoc"]:
            yield item
        else:
            self.logger.warning(
                f"Bỏ qua sản phẩm thiếu tên, giá hoặc link: {response.url}"
            )

    def extract_card_text(self, anchor):
        text_candidates = [
            " ".join(anchor.xpath("ancestor::div[1]//text()").getall()),
            " ".join(anchor.xpath("ancestor::div[2]//text()").getall()),
            " ".join(anchor.xpath("ancestor::div[3]//text()").getall()),
            " ".join(anchor.xpath("ancestor::li[1]//text()").getall()),
            " ".join(anchor.xpath(".//text()").getall()),
        ]

        for text in text_candidates:
            clean_text = self.clean_text(text)

            if clean_text and self.parse_price(clean_text):
                return clean_text

        return self.clean_text(" ".join(anchor.xpath(".//text()").getall()))


    def extract_card_image(self, anchor, response):
        image_url = (
            anchor.css("img::attr(src)").get()
            or anchor.css("img::attr(data-src)").get()
            or anchor.xpath("ancestor::div[1]//img/@src").get()
            or anchor.xpath("ancestor::div[2]//img/@src").get()
            or anchor.xpath("ancestor::div[3]//img/@src").get()
            or anchor.xpath("ancestor::div[1]//img/@data-src").get()
            or anchor.xpath("ancestor::div[2]//img/@data-src").get()
            or anchor.xpath("ancestor::div[3]//img/@data-src").get()
        )

        if not image_url:
            return None

        return response.urljoin(image_url)

    def is_valid_product_url(self, url):
        if not url:
            return False

        parsed_url = urlparse(url)

        if parsed_url.netloc not in {
            "fptshop.com.vn",
            "www.fptshop.com.vn",
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

        # Trang chi tiết sản phẩm thường có dạng:
        # /danh-muc/ten-san-pham
        if len(path_segments) < 2:
            return False

        invalid_prefixes = {
            "tin-tuc",
            "khuyen-mai",
            "ho-tro",
            "gioi-thieu",
            "cua-hang",
            "tra-gop",
            "sim-so",
            "tim-kiem",
            "gio-hang",
            "thanh-toan",
            "tai-khoan",
            "chinh-sach",
        }

        if path_segments[0].lower() in invalid_prefixes:
            return False

        return True

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

        if price <= 0:
            return True

        is_accessory_product = (
            self.is_accessory_text(product_name)
            or self.is_accessory_url(url)
        )

        # Phụ kiện như ốp lưng, miếng dán, cáp sạc có thể dưới 1 triệu,
        # nên không được xem là giá bất thường.
        if is_accessory_product:
            return False

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

        if not normalized_keyword or not normalized_product_name:
            return False

        keyword_tokens = normalized_keyword.split()
        product_tokens = set(normalized_product_name.split())

        return all(
            token in product_tokens
            for token in keyword_tokens
        )

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
        path = urlparse(response.url).path.strip("/")

        if not path:
            return None

        slug_patterns = [
            r'"slug"\s*:\s*"'
            + re.escape(path)
            + r'"',

            r'\\"slug\\"\s*:\s*\\"'
            + re.escape(path)
            + r'\\"',

            r'"fullSlug"\s*:\s*"'
            + re.escape(path)
            + r'"',

            r'\\"fullSlug\\"\s*:\s*\\"'
            + re.escape(path)
            + r'\\"',
        ]

        slug_matches = []

        for slug_pattern in slug_patterns:
            slug_matches.extend(
                re.finditer(slug_pattern, html)
            )

        slug_matches = sorted(
            slug_matches,
            key=lambda match: match.start()
        )

        for slug_match in slug_matches:
            product_segment = html[
                slug_match.start():
                slug_match.start() + 15000
            ]

            for field_name in (
                "finalPrice",
                "currentPrice",
                "price",
            ):
                price_patterns = [
                    rf'"{field_name}"\s*:\s*(\d+)',
                    rf'\\"{field_name}\\"\s*:\s*(\d+)',
                ]

                for price_pattern in price_patterns:
                    price_match = re.search(
                        price_pattern,
                        product_segment,
                    )

                    if not price_match:
                        continue

                    price = int(price_match.group(1))

                    # Loại các giá trị nhỏ không thể là giá bán thực tế.
                    # Một số trường "price" trong __NEXT_DATA__ có thể chỉ là
                    # chỉ số, thứ tự hoặc dữ liệu phụ chứ không phải giá sản phẩm.
                    if price < 1000:
                        continue

                    return price

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
