from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB

from backend.app.core.database import Base


class SanPhamTho(Base):
    __tablename__ = "san_pham_tho"

    maSPTho = Column(Integer, primary_key=True, index=True, autoincrement=True)
    maSPCH = Column(Integer, nullable=True)

    tenSanPham = Column(String(255), nullable=False)
    sanTMDT = Column(String(50), nullable=False)
    giaHienTai = Column(Numeric(15, 2), nullable=False)

    linkGoc = Column(String(500), nullable=False)
    hinhAnh = Column(String(500), nullable=True)

    danhGia = Column(Float, nullable=True)
    soLuongDanhGia = Column(Integer, nullable=False, default=0)

    attributes = Column(JSONB, nullable=True)
    ngayCapNhat = Column(DateTime, nullable=False, default=datetime.utcnow)