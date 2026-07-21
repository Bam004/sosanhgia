# -*- coding: utf-8 -*-

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.core.datetime_utils import utc_now_naive


class EmailNotificationLog(Base):
    __tablename__ = "email_notification_log"

    maNhatKyEmail = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True,
    )

    maTheoDoi = Column(
        Integer,
        ForeignKey(
            "theo_doi_gia.maTheoDoi",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    maTaiKhoan = Column(
        Integer,
        ForeignKey(
            "tai_khoan.maTaiKhoan",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    emailNhan = Column(
        String(255),
        nullable=False,
        index=True,
    )

    tenNguoiNhan = Column(
        String(255),
        nullable=True,
    )

    tieuDe = Column(
        String(500),
        nullable=False,
    )

    loaiThongBao = Column(
        String(50),
        nullable=False,
        default="price_alert",
        server_default="price_alert",
    )

    tenSanPham = Column(
        String(1000),
        nullable=True,
    )

    giaMucTieu = Column(
        Numeric(15, 2),
        nullable=True,
    )

    giaHienTai = Column(
        Numeric(15, 2),
        nullable=True,
    )

    nguonGia = Column(
        String(255),
        nullable=True,
    )

    linkSanPham = Column(
        Text,
        nullable=True,
    )

    linkGoc = Column(
        Text,
        nullable=True,
    )

    trangThai = Column(
        String(30),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )

    soLanThu = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    loiGanNhat = Column(
        Text,
        nullable=True,
    )

    ngayTao = Column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
    )

    ngayGui = Column(
        DateTime,
        nullable=True,
    )

    ngayCapNhat = Column(
        DateTime,
        nullable=False,
        default=utc_now_naive,
        onupdate=utc_now_naive,
    )

    theo_doi = relationship("TheoDoiGia")
    tai_khoan = relationship("TaiKhoan")

    __table_args__ = (
        Index(
            "ix_email_log_trang_thai_ngay_tao",
            "trangThai",
            "ngayTao",
        ),
        Index(
            "ix_email_log_theo_doi_trang_thai",
            "maTheoDoi",
            "trangThai",
        ),
    )

