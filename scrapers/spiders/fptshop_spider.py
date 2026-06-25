import scrapy
from datetime import datetime
from scrapers.items import SanPhamThoItem


class FptshopSpider(scrapy.Spider):
    name = "fptshop"
    allowed_domains = ["fptshop.com.vn"]
    start_urls = ["https://fptshop.com.vn/dien-thoai"]

    def parse(self, response):
        self.logger.info(f"Status code: {response.status}")

        item = SanPhamThoItem()
        item["tenSanPham"] = response.css("title::text").get()
        item["sanTMDT"] = "FPT Shop"
        item["giaHienTai"] = None
        item["linkGoc"] = response.url
        item["hinhAnh"] = None
        item["danhGia"] = None
        item["soLuongDanhGia"] = 0
        item["attributes"] = {
            "test": True,
            "moTa": "Kiểm tra spider FPT Shop chạy được"
        }
        item["ngayCapNhat"] = datetime.now().isoformat()

        yield item