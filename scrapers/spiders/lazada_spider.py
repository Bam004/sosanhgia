import scrapy


class LazadaSpider(scrapy.Spider):
    name = "lazada"
    allowed_domains = ["lazada.vn"]
    start_urls = ["https://www.lazada.vn/dien-thoai-di-dong/"]

    def parse(self, response):
        pass