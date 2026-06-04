"""applications.durum String'e çevir + application_durum_gecmis tablosu

Revision ID: f5a2b8d1c9e4
Revises: e4f8c1a7b3d9
Create Date: 2026-05-25 18:30:00.000000

5'li başvuru durumu (bekleyen/inceleniyor/mulakat/kabul/red) için durum kolonunu
PostgreSQL Enum'dan String(20)'ye dönüştürür ve her durum geçişini izleyen
audit trail tablosu (`application_durum_gecmis`) ekler.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f5a2b8d1c9e4"
down_revision: Union[str, Sequence[str], None] = "e4f8c1a7b3d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) applications.durum: enum -> String(20)
    op.execute("ALTER TABLE applications ALTER COLUMN durum TYPE VARCHAR(20) USING durum::text")
    op.execute("ALTER TABLE applications ALTER COLUMN durum SET DEFAULT 'bekleyen'")

    # 2) Geçmiş tablosu — her durum değişimi bir satır
    op.create_table(
        "application_durum_gecmis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(),
                  sa.ForeignKey("applications.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("eski_durum", sa.String(20), nullable=True),
        sa.Column("yeni_durum", sa.String(20), nullable=False),
        sa.Column("degistiren_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("not_", sa.Text(), nullable=True),     # şirket isteğe bağlı not ekleyebilir
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("application_durum_gecmis")
    # PostgreSQL'de tekrar enum'a dönüştürme — eski tip yine mevcut olmalı
    op.execute("ALTER TABLE applications ALTER COLUMN durum DROP DEFAULT")
    op.execute("ALTER TABLE applications ALTER COLUMN durum TYPE applicationstatus "
               "USING durum::applicationstatus")
    op.execute("ALTER TABLE applications ALTER COLUMN durum "
               "SET DEFAULT 'bekleyen'::applicationstatus")
