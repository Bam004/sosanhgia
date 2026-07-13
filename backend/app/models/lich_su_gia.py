from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.core.datetime_utils import utc_now_naive


class LichSuGia(Base):
    __tablename__ = "lich_su_gia"
    __table_args__ = (
        Index(
            "ix_lsg_masptho_ngay",
            "maSPTho",
            "ngayGhiNhan",
        ),
    )

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
        default=utc_now_naive,
        index=True,
    )

    san_pham_tho = relationship("SanPhamTho", back_populates="lich_su_gia")
