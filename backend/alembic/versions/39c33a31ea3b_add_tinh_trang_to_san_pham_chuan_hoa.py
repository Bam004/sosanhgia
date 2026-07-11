"""add product condition to normalized product

Revision ID: 39c33a31ea3b
Revises: 476eeb86f7bc
Create Date: 2026-07-08 23:46:24.433048

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '39c33a31ea3b'
down_revision: Union[str, Sequence[str], None] = '476eeb86f7bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "san_pham_chuan_hoa",
        sa.Column(
            "tinhTrang",
            sa.String(length=30),
            nullable=False,
            server_default="new"
        )
    )

    op.drop_constraint(
        "uix_product_type_model_storage",
        "san_pham_chuan_hoa",
        type_="unique"
    )

    op.create_unique_constraint(
        "uix_product_type_model_storage_condition",
        "san_pham_chuan_hoa",
        ["productType", "modelKey", "dungLuong", "tinhTrang"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "uix_product_type_model_storage_condition",
        "san_pham_chuan_hoa",
        type_="unique"
    )

    op.create_unique_constraint(
        "uix_product_type_model_storage",
        "san_pham_chuan_hoa",
        ["productType", "modelKey", "dungLuong"]
    )

    op.drop_column("san_pham_chuan_hoa", "tinhTrang")