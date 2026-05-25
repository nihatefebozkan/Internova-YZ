"""gruplar sistemi: groups, memberships, join_requests, projects,
project_departments, department_applications, skill_tags, user_skills,
group_messages

Revision ID: b7e9f1a2c3d4
Revises: 0c247810319c
Create Date: 2026-05-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b7e9f1a2c3d4"
down_revision: Union[str, Sequence[str], None] = "0c247810319c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- skill_tags (önce, başkalarına FK olacak) -------------------------
    op.create_table(
        "skill_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ad", sa.String(100), nullable=False, unique=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True, index=True),
        sa.Column("kategori", sa.String(80), nullable=True),  # dil/framework/araç vb.
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ---- user_skills -----------------------------------------------------
    op.create_table(
        "user_skills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("skill_tag_id", sa.Integer(), sa.ForeignKey("skill_tags.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("seviye", sa.Integer(), nullable=False, server_default="3"),  # 1-5
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "skill_tag_id", name="uq_user_skill"),
    )

    # ---- groups ----------------------------------------------------------
    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ad", sa.String(200), nullable=False),
        sa.Column("aciklama", sa.Text(), nullable=True),
        sa.Column("kapak_url", sa.String(500), nullable=True),
        sa.Column("kategori", sa.String(80), nullable=True),
        sa.Column("max_uye", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("acik", sa.Boolean(), nullable=False, server_default=sa.true()),  # yeni üye alıyor mu
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ---- group_memberships ----------------------------------------------
    op.create_table(
        "group_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("rol", sa.String(20), nullable=False, server_default="member"),  # owner/moderator/member
        sa.Column("katilim_tarihi", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    # ---- group_join_requests --------------------------------------------
    op.create_table(
        "group_join_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("mesaj", sa.Text(), nullable=True),
        sa.Column("durum", sa.String(20), nullable=False, server_default="bekleyen"),  # bekleyen/kabul/red
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ---- projects --------------------------------------------------------
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ad", sa.String(200), nullable=False),
        sa.Column("kisa_aciklama", sa.Text(), nullable=True),
        sa.Column("kategori", sa.String(60), nullable=True),    # web/mobile/ai/oyun/data
        sa.Column("sure", sa.String(40), nullable=True),         # 1 ay / 3 ay / 6 ay
        sa.Column("seviye", sa.String(20), nullable=True),       # baslangic/orta/ileri
        sa.Column("hedef", sa.Text(), nullable=True),
        sa.Column("haftalik_saat", sa.Integer(), nullable=True),
        sa.Column("github_var", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("pitch", sa.Text(), nullable=True),
        sa.Column("gereksinimler", sa.Text(), nullable=True),
        sa.Column("durum", sa.String(20), nullable=False, server_default="acik"),  # acik/devam/tamamlandi
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ---- project_departments --------------------------------------------
    op.create_table(
        "project_departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ad", sa.String(100), nullable=False),         # Backend / Frontend / UI-UX
        sa.Column("gereken_kisi", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("beklentiler", sa.Text(), nullable=True),
        sa.Column("beceri_etiketleri", postgresql.JSONB(astext_type=sa.Text()), nullable=True),  # ["react","typescript"]
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ---- department_applications ---------------------------------------
    op.create_table(
        "department_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("project_departments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("applicant_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("mesaj", sa.Text(), nullable=True),
        sa.Column("durum", sa.String(20), nullable=False, server_default="bekleyen"),  # bekleyen/kabul/red
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("department_id", "applicant_id", name="uq_department_application"),
    )

    # ---- group_messages -------------------------------------------------
    op.create_table(
        "group_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("icerik", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("group_messages")
    op.drop_table("department_applications")
    op.drop_table("project_departments")
    op.drop_table("projects")
    op.drop_table("group_join_requests")
    op.drop_table("group_memberships")
    op.drop_table("groups")
    op.drop_table("user_skills")
    op.drop_table("skill_tags")
