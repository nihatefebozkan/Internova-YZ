"""staj_evraklari tablosu — öğrenci-yüklenen + akademisyen-onaylanan dijital evrak

Revision ID: a9b4f2d8e6c1
Revises: f5a2b8d1c9e4
Create Date: 2026-06-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9b4f2d8e6c1"
down_revision: Union[str, Sequence[str], None] = "f5a2b8d1c9e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "staj_evraklari",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(),
                  sa.ForeignKey("applications.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("yukleyen_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("ad", sa.String(200), nullable=False),
        sa.Column("tip", sa.String(40), nullable=False,
                  server_default="diger"),
        # kabul_mektubu | sigorta_bilgisi | is_yeri_degerlendirme |
        # ogrenci_degerlendirme | staj_defteri | diger
        sa.Column("dosya_url", sa.String(500), nullable=True),
        sa.Column("dosya_adi", sa.String(200), nullable=True),
        sa.Column("durum", sa.String(20), nullable=False,
                  server_default="bekleyen"),  # bekleyen | onayli | red
        sa.Column("onaylayan_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("onay_notu", sa.Text(), nullable=True),
        sa.Column("onay_tarihi", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("staj_evraklari")
