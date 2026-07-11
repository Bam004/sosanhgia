"""add week7 performance indexes

Revision ID: 346ac8d17abe
Revises: 4b5fa4d791ee
Create Date: 2026-07-10 00:00:39.346337

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '346ac8d17abe'
down_revision: Union[str, Sequence[str], None] = '4b5fa4d791ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Hỗ trợ tăng tốc tìm kiếm ILIKE trên các cột text của PostgreSQL.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # san_pham_chuan_hoa: phục vụ tìm kiếm, lọc theo brand/model/tình trạng.
    op.create_index(
        "ix_spch_ten_chuan_hoa_trgm",
        "san_pham_chuan_hoa",
        ["tenChuanHoa"],
        postgresql_using="gin",
        postgresql_ops={"tenChuanHoa": "gin_trgm_ops"},
    )
    op.create_index("ix_spch_thuong_hieu", "san_pham_chuan_hoa", ["thuongHieu"])
    op.create_index("ix_spch_model_key", "san_pham_chuan_hoa", ["modelKey"])
    op.create_index("ix_spch_product_type", "san_pham_chuan_hoa", ["productType"])
    op.create_index("ix_spch_tinh_trang", "san_pham_chuan_hoa", ["tinhTrang"])
    op.create_index("ix_spch_ngay_cap_nhat", "san_pham_chuan_hoa", ["ngayCapNhat"])

    # san_pham_tho: phục vụ compare, lọc nguồn bán, sort giá và cập nhật dữ liệu.
    op.create_index("ix_sptho_maspch", "san_pham_tho", ["maSPCH"])
    op.create_index("ix_sptho_san_tmdt", "san_pham_tho", ["sanTMDT"])
    op.create_index("ix_sptho_gia_hien_tai", "san_pham_tho", ["giaHienTai"])
    op.create_index("ix_sptho_ngay_cap_nhat", "san_pham_tho", ["ngayCapNhat"])
    op.create_index("ix_sptho_maspch_gia", "san_pham_tho", ["maSPCH", "giaHienTai"])

    # lich_su_gia: phục vụ biểu đồ lịch sử giá theo sản phẩm thô và thời gian.
    op.create_index("ix_lsg_masptho", "lich_su_gia", ["maSPTho"])
    op.create_index("ix_lsg_ngay_ghi_nhan", "lich_su_gia", ["ngayGhiNhan"])
    op.create_index("ix_lsg_masptho_ngay", "lich_su_gia", ["maSPTho", "ngayGhiNhan"])

    # theo_doi_gia: phục vụ lấy danh sách theo dõi theo user/trạng thái.
    op.create_index("ix_tdg_trang_thai", "theo_doi_gia", ["trangThai"])
    op.create_index("ix_tdg_user_trang_thai", "theo_doi_gia", ["maTaiKhoan", "trangThai"])

    # search_job_source_status: đã có nhiều index, bổ sung theo thời gian cập nhật để xem log/trạng thái gần nhất.
    op.create_index("ix_sjss_ngay_cap_nhat", "search_job_source_status", ["ngayCapNhat"])


def downgrade() -> None:
    op.drop_index("ix_sjss_ngay_cap_nhat", table_name="search_job_source_status")

    op.drop_index("ix_tdg_user_trang_thai", table_name="theo_doi_gia")
    op.drop_index("ix_tdg_trang_thai", table_name="theo_doi_gia")

    op.drop_index("ix_lsg_masptho_ngay", table_name="lich_su_gia")
    op.drop_index("ix_lsg_ngay_ghi_nhan", table_name="lich_su_gia")
    op.drop_index("ix_lsg_masptho", table_name="lich_su_gia")

    op.drop_index("ix_sptho_maspch_gia", table_name="san_pham_tho")
    op.drop_index("ix_sptho_ngay_cap_nhat", table_name="san_pham_tho")
    op.drop_index("ix_sptho_gia_hien_tai", table_name="san_pham_tho")
    op.drop_index("ix_sptho_san_tmdt", table_name="san_pham_tho")
    op.drop_index("ix_sptho_maspch", table_name="san_pham_tho")

    op.drop_index("ix_spch_ngay_cap_nhat", table_name="san_pham_chuan_hoa")
    op.drop_index("ix_spch_tinh_trang", table_name="san_pham_chuan_hoa")
    op.drop_index("ix_spch_product_type", table_name="san_pham_chuan_hoa")
    op.drop_index("ix_spch_model_key", table_name="san_pham_chuan_hoa")
    op.drop_index("ix_spch_thuong_hieu", table_name="san_pham_chuan_hoa")
    op.drop_index("ix_spch_ten_chuan_hoa_trgm", table_name="san_pham_chuan_hoa")