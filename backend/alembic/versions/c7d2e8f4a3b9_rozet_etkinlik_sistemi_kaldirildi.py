"""rozet + etkinlik sistemi kaldırıldı

Revision ID: c7d2e8f4a3b9
Revises: a9b4f2d8e6c1
Create Date: 2026-06-06 12:00:00.000000

4 tablo + 1 enum (eventcategory) düşürülür.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c7d2e8f4a3b9"
down_revision: Union[str, Sequence[str], None] = "a9b4f2d8e6c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Bağımlı tablolar önce
    op.drop_table("user_badges")
    op.drop_table("event_attendees")
    op.drop_table("badges")
    op.drop_table("events")
    # PostgreSQL enum'unu temizle
    op.execute("DROP TYPE IF EXISTS eventcategory")


def downgrade() -> None:
    # Geri alma desteklenmiyor — feature kaldırıldı
    raise NotImplementedError("Rozet ve etkinlik sistemi kaldırıldı, geri alınmaz.")
