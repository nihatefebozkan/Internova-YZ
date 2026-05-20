# InternovaYZ platform modelleri: kullanıcılar, stajlar, başvurular,
# CV, sertifika, portfolyo, staj defteri, rozetler, etkinlikler ve takımlar.

import enum
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# ---------------------------------------------------------------------------
# Enum tanımları
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    company = "company"


class InternshipStatus(str, enum.Enum):
    aktif = "aktif"
    kapali = "kapali"
    taslak = "taslak"


class ApplicationStatus(str, enum.Enum):
    bekleyen = "bekleyen"
    kabul = "kabul"
    red = "red"


class LLMProcessingStatus(str, enum.Enum):
    bekliyor = "bekliyor"
    tamamlandi = "tamamlandi"
    hata = "hata"


class EventCategory(str, enum.Enum):
    panel = "panel"
    gezi = "gezi"
    workshop = "workshop"
    konferans = "konferans"
    diger = "diger"


class TeamStatus(str, enum.Enum):
    acik = "acik"
    dolu = "dolu"
    tamamlandi = "tamamlandi"


class TeamApplicationStatus(str, enum.Enum):
    bekleyen = "bekleyen"
    kabul = "kabul"
    red = "red"


# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    ad = Column(String(100), nullable=False)
    soyad = Column(String(100), nullable=False)
    bolum = Column(String(200))
    ogrenci_no = Column(String(50))
    telefon = Column(String(20))
    profil_foto_url = Column(String(500))
    email_dogrulandi = Column(Boolean, default=False, nullable=False)
    aktif = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # İlişkiler
    internships = relationship("Internship", back_populates="company", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student", foreign_keys="Application.student_id", cascade="all, delete-orphan")
    cv = relationship("CV", back_populates="student", uselist=False, cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="student", cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="student", cascade="all, delete-orphan")
    diary_entries = relationship("DiaryEntry", back_populates="student", cascade="all, delete-orphan")
    user_badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    organized_events = relationship("Event", back_populates="organizator", cascade="all, delete-orphan")
    event_attendances = relationship("EventAttendee", back_populates="user", cascade="all, delete-orphan")
    led_teams = relationship("ProjectTeam", back_populates="lider", cascade="all, delete-orphan")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    team_applications = relationship("TeamApplication", back_populates="applicant", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# internships
# ---------------------------------------------------------------------------

class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pozisyon = Column(String(200), nullable=False)
    departman = Column(String(200))
    konum = Column(String(200))
    aciklama = Column(Text)
    gereksinimler = Column(Text)
    kontenjan = Column(Integer, default=1)
    basvuru_son_tarih = Column(Date)
    staj_baslangic = Column(Date)
    staj_bitis = Column(Date)
    ucret_var_mi = Column(Boolean, default=False, nullable=False)
    durum = Column(Enum(InternshipStatus), default=InternshipStatus.taslak, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship("User", back_populates="internships")
    applications = relationship("Application", back_populates="internship", cascade="all, delete-orphan")
    diary_entries = relationship("DiaryEntry", back_populates="internship", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# applications
# ---------------------------------------------------------------------------

class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("student_id", "internship_id", name="uq_application_student_internship"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, index=True)
    durum = Column(Enum(ApplicationStatus), default=ApplicationStatus.bekleyen, nullable=False)
    basvuru_tarihi = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    karar_tarihi = Column(DateTime(timezone=True))
    on_yazi = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User", back_populates="applications", foreign_keys=[student_id])
    internship = relationship("Internship", back_populates="applications")


# ---------------------------------------------------------------------------
# cvs
# ---------------------------------------------------------------------------

class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    ozet = Column(Text)
    egitim = Column(JSONB)
    deneyim = Column(JSONB)
    beceriler = Column(JSONB)
    diller = Column(JSONB)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    student = relationship("User", back_populates="cv")


# ---------------------------------------------------------------------------
# certificates
# ---------------------------------------------------------------------------

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ad = Column(String(300), nullable=False)
    veren_kurum = Column(String(300))
    tarih = Column(Date)
    dosya_url = Column(String(500))
    ocr_metin = Column(Text)
    dogrulanmis = Column(Boolean, default=False, nullable=False)
    ocr_skoru = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User", back_populates="certificates")


# ---------------------------------------------------------------------------
# portfolios
# ---------------------------------------------------------------------------

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    proje_adi = Column(String(300), nullable=False)
    aciklama = Column(Text)
    github_link = Column(String(500))
    demo_link = Column(String(500))
    teknolojiler = Column(JSONB)
    gorseller = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User", back_populates="portfolios")


# ---------------------------------------------------------------------------
# diary_entries
# ---------------------------------------------------------------------------

class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, index=True)
    tarih = Column(Date, nullable=False)
    ham_metin = Column(Text)
    akademik_metin = Column(Text)
    llm_isleme_durumu = Column(Enum(LLMProcessingStatus), default=LLMProcessingStatus.bekliyor, nullable=False)
    onaylandi = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User", back_populates="diary_entries")
    internship = relationship("Internship", back_populates="diary_entries")


# ---------------------------------------------------------------------------
# badges
# ---------------------------------------------------------------------------

class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    ad = Column(String(200), unique=True, nullable=False)
    aciklama = Column(Text)
    ikon_url = Column(String(500))
    kategori = Column(String(100))
    kazanma_kurali = Column(JSONB)

    user_badges = relationship("UserBadge", back_populates="badge", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# user_badges
# ---------------------------------------------------------------------------

class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True)
    kazanma_tarihi = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="user_badges")
    badge = relationship("Badge", back_populates="user_badges")


# ---------------------------------------------------------------------------
# events
# ---------------------------------------------------------------------------

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    organizator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    baslik = Column(String(300), nullable=False)
    aciklama = Column(Text)
    kategori = Column(Enum(EventCategory), nullable=False)
    baslangic_tarihi = Column(DateTime(timezone=True), nullable=False)
    bitis_tarihi = Column(DateTime(timezone=True))
    konum = Column(String(300))
    kapasite = Column(Integer)
    qr_kod = Column(String(500), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organizator = relationship("User", back_populates="organized_events")
    attendees = relationship("EventAttendee", back_populates="event", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# event_attendees
# ---------------------------------------------------------------------------

class EventAttendee(Base):
    __tablename__ = "event_attendees"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_attendee"),
    )

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    katilim_zamani = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    event = relationship("Event", back_populates="attendees")
    user = relationship("User", back_populates="event_attendances")


# ---------------------------------------------------------------------------
# project_teams
# ---------------------------------------------------------------------------

class ProjectTeam(Base):
    __tablename__ = "project_teams"

    id = Column(Integer, primary_key=True, index=True)
    lider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    proje_adi = Column(String(300), nullable=False)
    aciklama = Column(Text)
    aranan_yetkinlikler = Column(JSONB)
    max_uye_sayisi = Column(Integer, default=5)
    durum = Column(Enum(TeamStatus), default=TeamStatus.acik, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lider = relationship("User", back_populates="led_teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    applications = relationship("TeamApplication", back_populates="team", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# team_members
# ---------------------------------------------------------------------------

class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("project_teams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rol = Column(String(100))
    katilim_tarihi = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    team = relationship("ProjectTeam", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


# ---------------------------------------------------------------------------
# team_applications
# ---------------------------------------------------------------------------

class TeamApplication(Base):
    __tablename__ = "team_applications"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("project_teams.id", ondelete="CASCADE"), nullable=False, index=True)
    applicant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mesaj = Column(Text)
    durum = Column(Enum(TeamApplicationStatus), default=TeamApplicationStatus.bekleyen, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    team = relationship("ProjectTeam", back_populates="applications")
    applicant = relationship("User", back_populates="team_applications")
