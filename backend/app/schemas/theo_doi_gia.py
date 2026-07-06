from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class TheoDoiGiaCreate(BaseModel):
    maSPCH: int
    giaMongMuon: Optional[Decimal] = None


class TheoDoiGiaUpdate(BaseModel):
    giaMongMuon: Optional[Decimal] = None
    trangThai: Optional[bool] = None


class TheoDoiGiaResponse(BaseModel):
    maTheoDoi: int
    maTaiKhoan: int
    maSPCH: int
    giaMongMuon: Optional[Decimal] = None
    trangThai: bool
    ngayTheoDoi: datetime
    ngayCapNhat: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True


class TheoDoiGiaListItem(BaseModel):
    maTheoDoi: int
    maSPCH: int
    tenChuanHoa: str
    anhDaiDien: Optional[str] = None
    giaThapNhat: Optional[Decimal] = None
    giaCaoNhat: Optional[Decimal] = None
    giaMongMuon: Optional[Decimal] = None
    trangThai: bool
    ngayTheoDoi: datetime

    class Config:
        orm_mode = True
        from_attributes = True
