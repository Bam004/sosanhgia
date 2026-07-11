from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SanPhamThoBase(BaseModel):
    maSPCH: int | None = None
    tenSanPham: str = Field(..., max_length=255)
    sanTMDT: str = Field(..., max_length=50)
    giaHienTai: Decimal = Field(..., gt=0)
    linkGoc: str = Field(..., max_length=500)
    hinhAnh: str | None = None
    danhGia: float | None = None
    soLuongDanhGia: int = Field(default=0, ge=0)
    sellerName: str | None = Field(default=None, max_length=255)
    sellerRating: float | None = None
    attributes: dict[str, Any] | None = None


class SanPhamThoCreate(SanPhamThoBase):
    pass


class SanPhamThoUpdate(BaseModel):
    maSPCH: int | None = None
    tenSanPham: str | None = Field(default=None, max_length=255)
    sanTMDT: str | None = Field(default=None, max_length=50)
    giaHienTai: Decimal | None = Field(default=None, gt=0)
    linkGoc: str | None = Field(default=None, max_length=500)
    hinhAnh: str | None = None
    danhGia: float | None = None
    soLuongDanhGia: int | None = Field(default=None, ge=0)
    attributes: dict[str, Any] | None = None


class SanPhamThoResponse(SanPhamThoBase):
    maSPTho: int
    ngayCapNhat: datetime

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SanPhamThoBulkCreate(BaseModel):
    # Dùng model_validator để hỗ trợ song song tiếng Anh và tiếng Việt
    raw_title: str | None = Field(default=None, max_length=255)
    tenSanPham: str | None = Field(default=None, max_length=255)
    
    standardized_product_id: int | None = None
    maSPCH: int | None = None
    
    merchant_name: str | None = Field(default=None, max_length=50)
    sanTMDT: str | None = Field(default=None, max_length=50)
    
    current_price: str | int | float | Decimal | None = None
    giaHienTai: str | int | float | Decimal | None = None
    
    origin_url: str | None = Field(default=None, max_length=500)
    linkGoc: str | None = Field(default=None, max_length=500)
    
    image_url: str | None = None
    hinhAnh: str | None = None
    
    rating: float | None = None
    danhGia: float | None = None
    
    review_count: int | None = Field(default=None, ge=0)
    soLuongDanhGia: int | None = Field(default=None, ge=0)
    
    seller_name: str | None = Field(default=None, max_length=255)
    sellerName: str | None = Field(default=None, max_length=255)
    
    seller_rating: float | None = None
    sellerRating: float | None = None
    
    attributes: dict[str, Any] | None = None

    @model_validator(mode='after')
    def check_required_fields(self):
        # Title
        if not self.raw_title and not self.tenSanPham:
            raise ValueError("title/tenSanPham is required")
        if not self.raw_title:
            self.raw_title = self.tenSanPham
            
        # Merchant
        if not self.merchant_name and not self.sanTMDT:
            raise ValueError("merchant/sanTMDT is required")
        if not self.merchant_name:
            self.merchant_name = self.sanTMDT
            
        # Price
        if self.current_price is None and self.giaHienTai is None:
            raise ValueError("price/giaHienTai is required")
        if self.current_price is None:
            self.current_price = self.giaHienTai
            
        # URL
        if not self.origin_url and not self.linkGoc:
            raise ValueError("url/linkGoc is required")
        if not self.origin_url:
            self.origin_url = self.linkGoc
            
        # Others
        if self.image_url is None:
            self.image_url = self.hinhAnh
        if self.rating is None:
            self.rating = self.danhGia
        if self.review_count is None:
            self.review_count = self.soLuongDanhGia or 0
        if self.standardized_product_id is None:
            self.standardized_product_id = self.maSPCH
        if self.sellerName is None:
            self.sellerName = self.seller_name
        if self.sellerRating is None:
            self.sellerRating = self.seller_rating
            
        return self