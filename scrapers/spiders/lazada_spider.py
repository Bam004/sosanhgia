
import json
import subprocess
import sys
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

        for product in products:
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
