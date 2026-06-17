import scrapy


class SanPhamThoItem(scrapy.Item):
    tenSanPham = scrapy.Field()
    sanTMDT = scrapy.Field()
    giaHienTai = scrapy.Field()
    linkGoc = scrapy.Field()
    hinhAnh = scrapy.Field()
    danhGia = scrapy.Field()
    soLuongDanhGia = scrapy.Field()
    attributes = scrapy.Field()
    ngayCapNhat = scrapy.Field()