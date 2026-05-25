"""users.github_username + portfolios.katki_analizi

Revision ID: c8f1d9e2a4b5
Revises: b7e9f1a2c3d4
Create Date: 2026-05-24 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c8f1d9e2a4b5"
down_revision: Union[str, Sequence[str], None] = "b7e9f1a2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("github_username", sa.String(100), nullable=True))
    op.add_column(
        "portfolios",
        sa.Column(
            "katki_analizi",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("portfolios", "katki_analizi")
    op.drop_column("users", "github_username")
