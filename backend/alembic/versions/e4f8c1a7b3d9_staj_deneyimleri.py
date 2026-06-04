"""staj_deneyimleri tablosu + applications.tamamlandi flag

Revision ID: e4f8c1a7b3d9
Revises: d3a7e9c5b1f8
Create Date: 2026-05-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e4f8c1a7b3d9"
down_revision: Union[str, Sequence[str], None] = "d3a7e9c5b1f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Applications: staj tamamlandı flag — alumni track ve deneyim paylaşımı için
    op.add_column(
        "applications",
        sa.Column("tamamlandi", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # Anonim staj deneyimleri
    op.create_table(
        "staj_deneyimleri",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("paylasan_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="SET NULL"), nullable=True),
        sa.Column("bolum_kodu", sa.String(50), nullable=True),
        sa.Column("donem", sa.String(40), nullable=True),                     # "2026-Yaz", "2025-Kış"
        sa.Column("calistigi_departman", sa.String(120), nullable=True),
        sa.Column("genel_yorum", sa.Text(), nullable=False),
        sa.Column("ogrendigi_teknolojiler", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("puan", sa.Integer(), nullable=True),                        # 1-5
        sa.Column("tavsiye_eder_mi", sa.Boolean(), nullable=True),
        sa.Column("onay_durumu", sa.String(20), nullable=False, server_default="onayli"),  # onayli | bekleyen | red
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("company_id", "paylasan_id", "donem", name="uq_deneyim_per_donem"),
    )


def downgrade() -> None:
    op.drop_table("staj_deneyimleri")
    op.drop_column("applications", "tamamlandi")
