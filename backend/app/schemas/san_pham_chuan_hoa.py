from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SanPhamChuanHoaResponse(BaseModel):
    maSPCH: int
    tenChuan: str
    loai: Optional[str] = None
    thuongHieu: Optional[str] = None
    hinhAnhChinh: Optional[str] = None

    giaThapNhat: Optional[Decimal] = None
    giaCaoNhat: Optional[Decimal] = None

    soSanPhamTho: int
    soNguonBan: int

    trangThai: str
    canKiemTra: bool

    moTa: Optional[str] = None
    ngayTao: datetime
    ngayCapNhat: datetime

    model_config = ConfigDict(from_attributes=True)