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