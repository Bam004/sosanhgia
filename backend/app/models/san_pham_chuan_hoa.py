from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text

from backend.app.core.database import Base


class SanPhamChuanHoa(Base):
    __tablename__ = "san_pham_chuan_hoa"

    maSPCH = Column(Integer, primary_key=True, index=True, autoincrement=True)

    tenChuan = Column(String(255), nullable=False)
    loai = Column(String(100), nullable=True)
    thuongHieu = Column(String(100), nullable=True)
    hinhAnhChinh = Column(String(500), nullable=True)

    giaThapNhat = Column(Numeric(15, 2), nullable=True)
    giaCaoNhat = Column(Numeric(15, 2), nullable=True)

    soSanPhamTho = Column(Integer, nullable=False, default=0, server_default="0")
    soNguonBan = Column(Integer, nullable=False, default=0, server_default="0")

    trangThai = Column(
        String(50),
        nullable=False,
        default="CHUA_DU_NGUON",
        server_default="CHUA_DU_NGUON",
    )

    canKiemTra = Column(Boolean, nullable=False, default=False, server_default="false")

    moTa = Column(Text, nullable=True)
    ngayTao = Column(DateTime, nullable=False, default=datetime.utcnow)
    ngayCapNhat = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

