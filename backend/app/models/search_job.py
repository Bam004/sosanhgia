from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class SearchJob(Base):
    __tablename__ = "search_job"

    maSearchJob = Column(Integer, primary_key=True, index=True, autoincrement=True)

    keyword = Column(String(255), nullable=False, index=True)
    keywordChuanHoa = Column(String(255), nullable=True, index=True)

    trangThai = Column(String(30), nullable=False, default="pending", server_default="pending", index=True)

    tongRawItems = Column(Integer, nullable=False, default=0, server_default="0")
    tongFilteredItems = Column(Integer, nullable=False, default=0, server_default="0")
    tongGroups = Column(Integer, nullable=False, default=0, server_default="0")

    errorMessage = Column(String(1000), nullable=True)

    ngayTao = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    batDauLuc = Column(DateTime, nullable=True)
    ketThucLuc = Column(DateTime, nullable=True)

    source_statuses = relationship(
        "SearchJobSourceStatus",
        back_populates="search_job",
        cascade="all, delete-orphan"
    )


class SearchJobSourceStatus(Base):
    __tablename__ = "search_job_source_status"

    maSourceStatus = Column(Integer, primary_key=True, index=True, autoincrement=True)

    maSearchJob = Column(
        Integer,
        ForeignKey("search_job.maSearchJob", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    nguon = Column(String(50), nullable=False, index=True)
    trangThai = Column(String(30), nullable=False, default="pending", server_default="pending", index=True)

    rawCount = Column(Integer, nullable=False, default=0, server_default="0")
    matchedCount = Column(Integer, nullable=False, default=0, server_default="0")

    errorMessage = Column(String(1000), nullable=True)

    batDauLuc = Column(DateTime, nullable=True)
    ketThucLuc = Column(DateTime, nullable=True)
    ngayCapNhat = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    search_job = relationship("SearchJob", back_populates="source_statuses")

    __table_args__ = (
        UniqueConstraint("maSearchJob", "nguon", name="uix_search_job_source"),
    )
