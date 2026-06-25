import scrapy


class ShopeeSpider(scrapy.Spider):
    name = "shopee"
    allowed_domains = ["shopee.vn"]
    start_urls = ["https://shopee.vn/"]

    def parse(self, response):
        pass