from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class SanPhamChuanHoa(Base):
    __tablename__ = "san_pham_chuan_hoa"

    maSPCH = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenChuanHoa = Column(String(255), nullable=False)
    thuongHieu = Column(String(50), nullable=True)
    dungLuong = Column(String(50), nullable=True)
    modelKey = Column(String(100), nullable=True)
    productType = Column(String(50), nullable=True)
    tinhTrang = Column(String(30), nullable=False, default="new")
    anhDaiDien = Column(String(500), nullable=True)
    
    ngayTao = Column(DateTime, nullable=False, default=datetime.utcnow)
    ngayCapNhat = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("productType", "modelKey", "dungLuong", "tinhTrang", name="uix_product_type_model_storage_condition"),
    )

    san_pham_tho = relationship("SanPhamTho", back_populates="san_pham_chuan_hoa")

