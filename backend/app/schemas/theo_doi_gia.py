from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TheoDoiGiaCreate(BaseModel):
    maSPCH: int
    giaMongMuon: Decimal = Field(..., gt=0, description="Giá mong muốn phải lớn hơn 0")


class TheoDoiGiaUpdate(BaseModel):
    giaMongMuon: Optional[Decimal] = None
    trangThai: Optional[bool] = None


class TheoDoiGiaResponse(BaseModel):
    maTheoDoi: int
    maTaiKhoan: int
    maSPCH: int
    giaMongMuon: Optional[Decimal] = None
    trangThai: bool
    daThongBao: bool
    ngayThongBao: Optional[datetime] = None
    giaLucThongBao: Optional[Decimal] = None
    ngayTheoDoi: datetime
    ngayCapNhat: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TheoDoiGiaListItem(BaseModel):
    maTheoDoi: int
    maSPCH: int
    tenChuanHoa: str
    anhDaiDien: Optional[str] = None
    giaThapNhat: Optional[Decimal] = None
    giaCaoNhat: Optional[Decimal] = None
    giaMongMuon: Optional[Decimal] = None
    trangThai: bool
    daThongBao: bool
    ngayThongBao: Optional[datetime] = None
    giaLucThongBao: Optional[Decimal] = None
    trangThaiHienThi: str
    ngayTheoDoi: datetime

    model_config = ConfigDict(from_attributes=True)
