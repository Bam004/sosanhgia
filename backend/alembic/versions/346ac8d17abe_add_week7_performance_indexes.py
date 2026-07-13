"""add week7 performance indexes

Revision ID: 346ac8d17abe
Revises: 4b5fa4d791ee
Create Date: 2026-07-10 00:00:39.346337
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "346ac8d17abe"
down_revision: Union[str, Sequence[str], None] = "4b5fa4d791ee"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_exists(
    bind,
    table_name: str,
    index_name: str,
    columns: list[str],
) -> bool:
    inspector = sa.inspect(bind)

    if not inspector.has_table(table_name):
        return False

    expected_columns = tuple(columns)

    for index in inspector.get_indexes(table_name):
        if index.get("name") == index_name:
            return True

        current_columns = tuple(index.get("column_names") or [])

        if current_columns == expected_columns:
            return True

    return False


def _create_index_if_missing(
    bind,
    index_name: str,
    table_name: str,
    columns: list[str],
    **kwargs,
) -> None:
    inspector = sa.inspect(bind)

    if not inspector.has_table(table_name):
        raise RuntimeError(
            f"Table {table_name} does not exist. "
            "Previous migrations must be applied first."
        )

    if not _index_exists(
        bind,
        table_name,
        index_name,
        columns,
    ):
        op.create_index(
            index_name,
            table_name,
            columns,
            **kwargs,
        )


def _drop_index_if_exists(
    bind,
    index_name: str,
    table_name: str,
) -> None:
    inspector = sa.inspect(bind)

    if not inspector.has_table(table_name):
        return

    index_names = {
        index["name"]
        for index in inspector.get_indexes(table_name)
        if index.get("name")
    }

    if index_name in index_names:
        op.drop_index(
            index_name,
            table_name=table_name,
        )


def upgrade() -> None:
    """Create the performance indexes required by the current models."""
    bind = op.get_bind()

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    _create_index_if_missing(
        bind,
        "ix_spch_ten_chuan_trgm",
        "san_pham_chuan_hoa",
        ["tenChuan"],
        postgresql_using="gin",
        postgresql_ops={
            "tenChuan": "gin_trgm_ops",
        },
    )

    _create_index_if_missing(
        bind,
        "ix_spch_thuong_hieu",
        "san_pham_chuan_hoa",
        ["thuongHieu"],
    )

    _create_index_if_missing(
        bind,
        "ix_spch_model_key",
        "san_pham_chuan_hoa",
        ["modelKey"],
    )

    _create_index_if_missing(
        bind,
        "ix_spch_product_type",
        "san_pham_chuan_hoa",
        ["productType"],
    )

    _create_index_if_missing(
        bind,
        "ix_spch_tinh_trang",
        "san_pham_chuan_hoa",
        ["tinhTrang"],
    )

    _create_index_if_missing(
        bind,
        "ix_spch_ngay_cap_nhat",
        "san_pham_chuan_hoa",
        ["ngayCapNhat"],
    )

    _create_index_if_missing(
        bind,
        "ix_sptho_san_tmdt",
        "san_pham_tho",
        ["sanTMDT"],
    )

    _create_index_if_missing(
        bind,
        "ix_sptho_gia_hien_tai",
        "san_pham_tho",
        ["giaHienTai"],
    )

    _create_index_if_missing(
        bind,
        "ix_sptho_ngay_cap_nhat",
        "san_pham_tho",
        ["ngayCapNhat"],
    )

    _create_index_if_missing(
        bind,
        "ix_sptho_maspch_gia",
        "san_pham_tho",
        ["maSPCH", "giaHienTai"],
    )

    _create_index_if_missing(
        bind,
        "ix_lsg_masptho_ngay",
        "lich_su_gia",
        ["maSPTho", "ngayGhiNhan"],
    )

    _create_index_if_missing(
        bind,
        "ix_tdg_trang_thai",
        "theo_doi_gia",
        ["trangThai"],
    )

    _create_index_if_missing(
        bind,
        "ix_tdg_user_trang_thai",
        "theo_doi_gia",
        ["maTaiKhoan", "trangThai"],
    )

    _create_index_if_missing(
        bind,
        "ix_sjss_ngay_cap_nhat",
        "search_job_source_status",
        ["ngayCapNhat"],
    )


def downgrade() -> None:
    """Drop only indexes created and named by this migration."""
    bind = op.get_bind()

    indexes = [
        (
            "ix_sjss_ngay_cap_nhat",
            "search_job_source_status",
        ),
        (
            "ix_tdg_user_trang_thai",
            "theo_doi_gia",
        ),
        (
            "ix_tdg_trang_thai",
            "theo_doi_gia",
        ),
        (
            "ix_lsg_masptho_ngay",
            "lich_su_gia",
        ),
        (
            "ix_sptho_maspch_gia",
            "san_pham_tho",
        ),
        (
            "ix_sptho_ngay_cap_nhat",
            "san_pham_tho",
        ),
        (
            "ix_sptho_gia_hien_tai",
            "san_pham_tho",
        ),
        (
            "ix_sptho_san_tmdt",
            "san_pham_tho",
        ),
        (
            "ix_spch_ngay_cap_nhat",
            "san_pham_chuan_hoa",
        ),
        (
            "ix_spch_tinh_trang",
            "san_pham_chuan_hoa",
        ),
        (
            "ix_spch_product_type",
            "san_pham_chuan_hoa",
        ),
        (
            "ix_spch_model_key",
            "san_pham_chuan_hoa",
        ),
        (
            "ix_spch_thuong_hieu",
            "san_pham_chuan_hoa",
        ),
        (
            "ix_spch_ten_chuan_trgm",
            "san_pham_chuan_hoa",
        ),
    ]

    for index_name, table_name in indexes:
        _drop_index_if_exists(
            bind,
            index_name,
            table_name,
        )
