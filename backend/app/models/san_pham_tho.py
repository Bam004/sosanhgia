from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.core.datetime_utils import utc_now_naive


class SanPhamTho(Base):
    __tablename__ = "san_pham_tho"
    __table_args__ = (
        Index("ix_sptho_san_tmdt", "sanTMDT"),
        Index("ix_sptho_gia_hien_tai", "giaHienTai"),
        Index("ix_sptho_ngay_cap_nhat", "ngayCapNhat"),
        Index(
            "ix_sptho_maspch_gia",
            "maSPCH",
            "giaHienTai",
        ),
    )

    maSPTho = Column(Integer, primary_key=True, index=True, autoincrement=True)

    maSPCH = Column(
        Integer,
        ForeignKey("san_pham_chuan_hoa.maSPCH", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    tenSanPham = Column(String(255), nullable=False)
    sanTMDT = Column(String(50), nullable=False)
    giaHienTai = Column(Numeric(15, 2), nullable=False)
    linkGoc = Column(String(500), nullable=False)
    hinhAnh = Column(String(500), nullable=True)
    danhGia = Column(Float, nullable=True)
    soLuongDanhGia = Column(Integer, nullable=False, default=0, server_default="0")
    attributes = Column(JSONB, nullable=True)
    ngayCapNhat = Column(DateTime, nullable=False, default=utc_now_naive)

    san_pham_chuan_hoa = relationship("SanPhamChuanHoa", back_populates="san_pham_tho")
    lich_su_gia = relationship("LichSuGia", back_populates="san_pham_tho", cascade="all, delete-orphan")
