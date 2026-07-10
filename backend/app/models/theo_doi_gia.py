from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class TheoDoiGia(Base):
    __tablename__ = "theo_doi_gia"

    maTheoDoi = Column(Integer, primary_key=True, index=True, autoincrement=True)

    maTaiKhoan = Column(
        Integer,
        ForeignKey("tai_khoan.maTaiKhoan", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    maSPCH = Column(
        Integer,
        ForeignKey("san_pham_chuan_hoa.maSPCH", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    giaMongMuon = Column(Numeric(15, 2), nullable=True)
    trangThai = Column(Boolean, nullable=False, default=True, server_default="true")

    daThongBao = Column(Boolean, nullable=False, default=False, server_default="false")
    ngayThongBao = Column(DateTime, nullable=True)
    giaLucThongBao = Column(Numeric(15, 2), nullable=True)

    ngayTheoDoi = Column(DateTime, nullable=False, default=datetime.utcnow)
    ngayCapNhat = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    tai_khoan = relationship("TaiKhoan")
    san_pham_chuan_hoa = relationship("SanPhamChuanHoa")

    __table_args__ = (
        UniqueConstraint("maTaiKhoan", "maSPCH", name="uix_theo_doi_gia_user_product"),
    )
