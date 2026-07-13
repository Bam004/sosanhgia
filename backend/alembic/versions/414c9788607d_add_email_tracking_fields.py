"""add email tracking fields

Revision ID: 414c9788607d
Revises: 346ac8d17abe
Create Date: 2026-07-10 18:37:15.381537
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "414c9788607d"
down_revision: Union[str, Sequence[str], None] = "346ac8d17abe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add notification tracking fields to theo_doi_gia."""
    op.add_column(
        "theo_doi_gia",
        sa.Column(
            "daThongBao",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )
    op.add_column(
        "theo_doi_gia",
        sa.Column(
            "ngayThongBao",
            sa.DateTime(),
            nullable=True,
        ),
    )
    op.add_column(
        "theo_doi_gia",
        sa.Column(
            "giaLucThongBao",
            sa.Numeric(precision=15, scale=2),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove notification tracking fields from theo_doi_gia."""
    op.drop_column("theo_doi_gia", "giaLucThongBao")
    op.drop_column("theo_doi_gia", "ngayThongBao")
    op.drop_column("theo_doi_gia", "daThongBao")
