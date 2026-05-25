"""portfolios derin analiz alanları: mimari, seviye, saglik, kavramlar, beceri_kategorileri

Revision ID: d3a7e9c5b1f8
Revises: c8f1d9e2a4b5
Create Date: 2026-05-24 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d3a7e9c5b1f8"
down_revision: Union[str, Sequence[str], None] = "c8f1d9e2a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("portfolios", sa.Column("mimari", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("portfolios", sa.Column("seviye", sa.String(40), nullable=True))   # tutorial / personal / production
    op.add_column("portfolios", sa.Column("saglik", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("portfolios", sa.Column("kavramlar", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("portfolios", sa.Column("beceri_kategorileri", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("portfolios", "beceri_kategorileri")
    op.drop_column("portfolios", "kavramlar")
    op.drop_column("portfolios", "saglik")
    op.drop_column("portfolios", "seviye")
    op.drop_column("portfolios", "mimari")
