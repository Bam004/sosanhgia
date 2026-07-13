"""add product condition and normalized-product unique constraint

Revision ID: 39c33a31ea3b
Revises: 476eeb86f7bc
Create Date: 2026-07-08 23:46:24.433048
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "39c33a31ea3b"
down_revision: Union[str, Sequence[str], None] = "476eeb86f7bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(inspector, table_name: str) -> set[str]:
    return {
        column["name"]
        for column in inspector.get_columns(table_name)
    }


def _unique_constraint_names(inspector, table_name: str) -> set[str]:
    return {
        constraint["name"]
        for constraint in inspector.get_unique_constraints(table_name)
        if constraint.get("name")
    }


def upgrade() -> None:
    """Add product condition and the current four-column unique constraint."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("san_pham_chuan_hoa"):
        raise RuntimeError(
            "Table san_pham_chuan_hoa does not exist. "
            "Previous migrations must be applied first."
        )

    columns = _column_names(inspector, "san_pham_chuan_hoa")

    if "tinhTrang" not in columns:
        op.add_column(
            "san_pham_chuan_hoa",
            sa.Column(
                "tinhTrang",
                sa.String(length=30),
                nullable=False,
                server_default="new",
            ),
        )

    inspector = sa.inspect(bind)
    constraint_names = _unique_constraint_names(
        inspector,
        "san_pham_chuan_hoa",
    )

    old_constraint = "uix_product_type_model_storage"
    current_constraint = "uix_product_type_model_storage_condition"

    if old_constraint in constraint_names:
        op.drop_constraint(
            old_constraint,
            "san_pham_chuan_hoa",
            type_="unique",
        )

    if current_constraint not in constraint_names:
        op.create_unique_constraint(
            current_constraint,
            "san_pham_chuan_hoa",
            [
                "productType",
                "modelKey",
                "dungLuong",
                "tinhTrang",
            ],
        )


def downgrade() -> None:
    """Remove the unique constraint and product-condition column."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("san_pham_chuan_hoa"):
        return

    constraint_names = _unique_constraint_names(
        inspector,
        "san_pham_chuan_hoa",
    )

    current_constraint = "uix_product_type_model_storage_condition"

    if current_constraint in constraint_names:
        op.drop_constraint(
            current_constraint,
            "san_pham_chuan_hoa",
            type_="unique",
        )

    inspector = sa.inspect(bind)
    columns = _column_names(inspector, "san_pham_chuan_hoa")

    if "tinhTrang" in columns:
        op.drop_column("san_pham_chuan_hoa", "tinhTrang")
