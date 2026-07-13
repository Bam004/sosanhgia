from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from backend.app.core.database import Base

class TaiKhoan(Base):
    __tablename__ = "tai_khoan"

    maTaiKhoan = Column(Integer, primary_key=True, autoincrement=True)
    hoTen = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    matKhauHash = Column(String(255), nullable=False)
    vaiTro = Column(String(50), default="user")
    trangThai = Column(String(50), default="active")
    ngayTao = Column(DateTime(timezone=True), server_default=func.now())
    ngayCapNhat = Column(DateTime(timezone=True), onupdate=func.now())
