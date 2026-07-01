
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import scrapy


class LazadaSpider(scrapy.Spider):
    name = "lazada"
    allowed_domains = ["lazada.vn"]

    custom_settings = {
        "ROBOTSTXT_OBEY": False,
        "DOWNLOAD_DELAY": 1,
    }

    def __init__(self, keyword="iphone 15", max_pages=1, headless="false", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.keyword = keyword
        self.max_pages = int(max_pages)
        self.headless = headless

    async def start(self):
        products = self._run_playwright_runner()

        self.logger.info("Runner returned %s Lazada products", len(products))

        filtered_products = []

        for product in products:
            product_name = product.get("tenSanPham")

            if not self.is_keyword_related_product(product_name):
                self.logger.info(
                    "Bỏ qua sản phẩm Lazada không khớp keyword '%s': %s",
                    self.keyword,
                    product_name
                )
                continue

            filtered_products.append(product)

        self.logger.info(
            "Lazada: giữ lại %s/%s sản phẩm khớp keyword",
            len(filtered_products),
            len(products)
        )

        for product in filtered_products:
            yield product

    def _run_playwright_runner(self):
        runner_path = Path(__file__).resolve().parents[1] / "lazada_playwright_runner.py"

        command = [
            sys.executable,
            str(runner_path),
            "--keyword",
            self.keyword,
            "--max-pages",
            str(self.max_pages),
            "--headless",
            str(self.headless),
        ]

        self.logger.info("Running Lazada Playwright runner")

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=240,
        )

        if result.stderr:
            self.logger.info("Lazada runner log:\n%s", result.stderr)

        if result.returncode != 0:
            self.logger.error("Lazada runner failed:\n%s", result.stderr)
            return []

        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            self.logger.error("Cannot parse Lazada runner JSON output:\n%s", result.stdout[:1000])
            return []

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
        if not text:
            return ""

        text = str(text).lower()
        text = unicodedata.normalize("NFD", text)
        text = "".join(
            char for char in text
            if unicodedata.category(char) != "Mn"
        )
        text = text.replace("đ", "d")

        text = re.sub(r"[/\-_,.()+|\"“”']", " ", text)

        text = re.sub(r"([a-z])(\d)", r"\1 \2", text)
        text = re.sub(r"(\d)([a-z])", r"\1 \2", text)

        text = re.sub(r"\s+", " ", text)

        return text.strip()