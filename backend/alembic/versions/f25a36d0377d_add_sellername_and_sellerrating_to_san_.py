"""add sellerName and sellerRating to san_pham_tho

Revision ID: f25a36d0377d
Revises: 414c9788607d
Create Date: 2026-07-11 13:18:00.810289

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add sellerName and sellerRating to san_pham_tho

Revision ID: f25a36d0377d
Revises: 414c9788607d
Create Date: 2026-07-11 13:18:00.810289

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f25a36d0377d'
down_revision: Union[str, Sequence[str], None] = '414c9788607d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('san_pham_tho', sa.Column('sellerName', sa.String(length=255), nullable=True))
    op.add_column('san_pham_tho', sa.Column('sellerRating', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('san_pham_tho', 'sellerRating')
    op.drop_column('san_pham_tho', 'sellerName')
