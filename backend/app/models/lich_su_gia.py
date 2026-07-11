from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class LichSuGia(Base):
    __tablename__ = "lich_su_gia"

    maLSG = Column(Integer, primary_key=True, index=True, autoincrement=True)
    maSPTho = Column(
        Integer,
        ForeignKey("san_pham_tho.maSPTho", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    gia = Column(Numeric(15, 2), nullable=False)
    ngayGhiNhan = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    san_pham_tho = relationship("SanPhamTho", back_populates="lich_su_gia")
