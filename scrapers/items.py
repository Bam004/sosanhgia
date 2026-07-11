import scrapy


class SanPhamThoItem(scrapy.Item):
    tenSanPham = scrapy.Field()
    sanTMDT = scrapy.Field()
    giaHienTai = scrapy.Field()
    linkGoc = scrapy.Field()
    hinhAnh = scrapy.Field()
    danhGia = scrapy.Field()
    soLuongDanhGia = scrapy.Field()
    sellerName = scrapy.Field()
    sellerRating = scrapy.Field()
    attributes = scrapy.Field()
    ngayCapNhat = scrapy.Field()