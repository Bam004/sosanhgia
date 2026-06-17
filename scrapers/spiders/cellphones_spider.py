import scrapy


class CellphonesSpider(scrapy.Spider):
    name = "cellphones"
    allowed_domains = ["cellphones.com.vn"]
    start_urls = ["https://cellphones.com.vn/mobile.html"]

    def parse(self, response):
        pass