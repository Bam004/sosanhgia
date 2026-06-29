import json
import subprocess
import sys
import tempfile
from pathlib import Path


class ScraperService:
    def __init__(self):
        self.project_root = Path(__file__).resolve().parents[3]

    def search_fptshop(self, keyword: str):
        keyword = self._clean_keyword(keyword)

        if not keyword:
            raise ValueError("Từ khóa tìm kiếm không được để trống.")

        output_file = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".json",
            prefix="fptshop_search_",
            delete=False,
            encoding="utf-8",
            dir=self.project_root
        )
        output_path = Path(output_file.name)
        output_file.close()

        command = [
            sys.executable,
            "-m",
            "scrapy",
            "crawl",
            "fptshop",
            "-a",
            f"keyword={keyword}",
            "-O",
            str(output_path)
        ]

        try:
            result = subprocess.run(
                command,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=180
            )

            if result.returncode != 0:
                raise RuntimeError(
                    "Không thể chạy FPT Shop spider. "
                    f"Chi tiết lỗi: {result.stderr}"
                )

            if not output_path.exists():
                return []

            with output_path.open("r", encoding="utf-8") as file:
                data = json.load(file)

            return data

        finally:
            if output_path.exists():
                output_path.unlink()

    def _clean_keyword(self, keyword: str):
        if keyword is None:
            return ""

        return " ".join(keyword.strip().split())

