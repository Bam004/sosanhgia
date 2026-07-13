"""reconcile normalized product and price history schema

Revision ID: 76e0f6a1bba6
Revises: 59a43d671c27
Create Date: 2026-07-06 08:29:47.804383
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "76e0f6a1bba6"
down_revision: Union[str, Sequence[str], None] = "59a43d671c27"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {
        column["name"]
        for column in inspector.get_columns(table_name)
    }


def _index_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {
        index["name"]
        for index in inspector.get_indexes(table_name)
        if index.get("name")
    }


def upgrade() -> None:
    """Bổ sung schema của nhánh User vào schema hiện có của nhánh Admin."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("san_pham_chuan_hoa"):
        raise RuntimeError(
            "Không tìm thấy bảng san_pham_chuan_hoa. "
            "Migration 59a43d671c27 phải được áp dụng trước."
        )

    spch_columns = _column_names(inspector, "san_pham_chuan_hoa")

    if "productType" not in spch_columns:
        op.add_column(
            "san_pham_chuan_hoa",
            sa.Column("productType", sa.String(length=100), nullable=True),
        )

    if "modelKey" not in spch_columns:
        op.add_column(
            "san_pham_chuan_hoa",
            sa.Column("modelKey", sa.String(length=150), nullable=True),
        )

    if "dungLuong" not in spch_columns:
        op.add_column(
            "san_pham_chuan_hoa",
            sa.Column("dungLuong", sa.String(length=50), nullable=True),
        )

    inspector = sa.inspect(bind)

    if not inspector.has_table("lich_su_gia"):
        op.create_table(
            "lich_su_gia",
            sa.Column(
                "maLSG",
                sa.Integer(),
                autoincrement=True,
                nullable=False,
            ),
            sa.Column("maSPTho", sa.Integer(), nullable=False),
            sa.Column(
                "gia",
                sa.Numeric(precision=15, scale=2),
                nullable=False,
            ),
            sa.Column("ngayGhiNhan", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["maSPTho"],
                ["san_pham_tho.maSPTho"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("maLSG"),
        )

        op.create_index(
            "ix_lich_su_gia_maLSG",
            "lich_su_gia",
            ["maLSG"],
            unique=False,
        )
        op.create_index(
            "ix_lich_su_gia_maSPTho",
            "lich_su_gia",
            ["maSPTho"],
            unique=False,
        )
        op.create_index(
            "ix_lich_su_gia_ngayGhiNhan",
            "lich_su_gia",
            ["ngayGhiNhan"],
            unique=False,
        )
    else:
        lsg_indexes = _index_names(inspector, "lich_su_gia")

        if "ix_lich_su_gia_maLSG" not in lsg_indexes:
            op.create_index(
                "ix_lich_su_gia_maLSG",
                "lich_su_gia",
                ["maLSG"],
                unique=False,
            )

        if "ix_lich_su_gia_maSPTho" not in lsg_indexes:
            op.create_index(
                "ix_lich_su_gia_maSPTho",
                "lich_su_gia",
                ["maSPTho"],
                unique=False,
            )

        if "ix_lich_su_gia_ngayGhiNhan" not in lsg_indexes:
            op.create_index(
                "ix_lich_su_gia_ngayGhiNhan",
                "lich_su_gia",
                ["ngayGhiNhan"],
                unique=False,
            )


def downgrade() -> None:
    """Hoàn tác các thành phần do revision này quản lý."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("lich_su_gia"):
        op.drop_table("lich_su_gia")

    inspector = sa.inspect(bind)

    if inspector.has_table("san_pham_chuan_hoa"):
        spch_columns = _column_names(inspector, "san_pham_chuan_hoa")

        if "dungLuong" in spch_columns:
            op.drop_column("san_pham_chuan_hoa", "dungLuong")

        if "modelKey" in spch_columns:
            op.drop_column("san_pham_chuan_hoa", "modelKey")

        if "productType" in spch_columns:
            op.drop_column("san_pham_chuan_hoa", "productType")
