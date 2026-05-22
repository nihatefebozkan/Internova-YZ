# Pydantic şemaları: tüm API istek ve yanıt formatları
import re
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

from app.models import ApplicationStatus, InternshipStatus, UserRole


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    bolum_kodu: Optional[str] = None  # öğrenci için zorunlu, diğer roller için opsiyonel

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalı")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Şifre en az bir büyük harf içermeli")
        if not re.search(r"\d", v):
            raise ValueError("Şifre en az bir rakam içermeli")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Ad en az 2 karakter olmalı")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    ad: str
    soyad: str
    role: UserRole
    bolum: Optional[str] = None
    bolum_kodu: Optional[str] = None
    ogrenci_no: Optional[str] = None
    telefon: Optional[str] = None
    profil_foto_url: Optional[str] = None
    aktif: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# ---------------------------------------------------------------------------
# Kullanıcı profil güncelleme
# ---------------------------------------------------------------------------

class UserProfileUpdate(BaseModel):
    ad: Optional[str] = None
    soyad: Optional[str] = None
    # bolum ve bolum_kodu kayıt sırasında seçilir, sonradan değiştirilemez
    ogrenci_no: Optional[str] = None
    telefon: Optional[str] = None
    profil_foto_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Staj ilanları
# ---------------------------------------------------------------------------

# Varsayılan beceri profili — tüm kategoriler 0
VARSAYILAN_BECERI_PROFILI = {
    "Yazılım Dilleri":    0,
    "Web Teknolojileri":  0,
    "Veritabanı":         0,
    "DevOps & Araçlar":   0,
    "Veri & YZ":          0,
    "Gömülü & Donanım":   0,
    "Yabancı Dil":        0,
    "Yönetim & İletişim": 0,
}


class InternshipCreate(BaseModel):
    pozisyon: str
    departman: Optional[str] = None
    konum: Optional[str] = None
    aciklama: Optional[str] = None
    gereksinimler: Optional[str] = None
    kontenjan: int = 1
    basvuru_son_tarih: Optional[date] = None
    staj_baslangic: Optional[date] = None
    staj_bitis: Optional[date] = None
    ucret_var_mi: bool = False
    durum: InternshipStatus = InternshipStatus.taslak
    bolum_kodu: Optional[str] = None      # hangi bölüme yönelik
    beceri_profili: Optional[dict] = None  # {kategori: 0-100}


class InternshipUpdate(BaseModel):
    pozisyon: Optional[str] = None
    departman: Optional[str] = None
    konum: Optional[str] = None
    aciklama: Optional[str] = None
    gereksinimler: Optional[str] = None
    kontenjan: Optional[int] = None
    basvuru_son_tarih: Optional[date] = None
    staj_baslangic: Optional[date] = None
    staj_bitis: Optional[date] = None
    ucret_var_mi: Optional[bool] = None
    durum: Optional[InternshipStatus] = None
    bolum_kodu: Optional[str] = None
    beceri_profili: Optional[dict] = None


class InternshipResponse(BaseModel):
    id: int
    company_id: int
    pozisyon: str
    departman: Optional[str] = None
    konum: Optional[str] = None
    aciklama: Optional[str] = None
    gereksinimler: Optional[str] = None
    kontenjan: int
    basvuru_son_tarih: Optional[date] = None
    staj_baslangic: Optional[date] = None
    staj_bitis: Optional[date] = None
    ucret_var_mi: bool
    durum: InternshipStatus
    bolum_kodu: Optional[str] = None
    beceri_profili: Optional[dict] = None
    created_at: datetime
    company: Optional[UserResponse] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Başvurular
# ---------------------------------------------------------------------------

class ApplicationCreate(BaseModel):
    on_yazi: Optional[str] = None


class ApplicationDecision(BaseModel):
    durum: ApplicationStatus  # kabul veya red


class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    internship_id: int
    durum: ApplicationStatus
    basvuru_tarihi: datetime
    karar_tarihi: Optional[datetime] = None
    on_yazi: Optional[str] = None
    created_at: datetime
    student: Optional[UserResponse] = None
    internship: Optional[InternshipResponse] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# CV
# ---------------------------------------------------------------------------

class CVUpdate(BaseModel):
    ozet: Optional[str] = None
    egitim: Optional[list[dict]] = None   # [{"okul":..., "derece":..., "yil":...}]
    deneyim: Optional[list[dict]] = None  # [{"sirket":..., "pozisyon":..., "sure":...}]
    beceriler: Optional[list[str]] = None
    diller: Optional[list[dict]] = None   # [{"dil":"İngilizce", "seviye":"B2"}]


class CVResponse(BaseModel):
    id: int
    student_id: int
    ozet: Optional[str] = None
    egitim: Optional[list] = None
    deneyim: Optional[list] = None
    beceriler: Optional[list] = None
    diller: Optional[list] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Portfolyo projeleri
# ---------------------------------------------------------------------------

class PortfolioCreate(BaseModel):
    proje_adi: str
    aciklama: Optional[str] = None
    github_link: Optional[str] = None
    demo_link: Optional[str] = None
    teknolojiler: Optional[list[str]] = None
    gorseller: Optional[list[str]] = None


class PortfolioUpdate(BaseModel):
    proje_adi: Optional[str] = None
    aciklama: Optional[str] = None
    github_link: Optional[str] = None
    demo_link: Optional[str] = None
    teknolojiler: Optional[list[str]] = None
    gorseller: Optional[list[str]] = None


class PortfolioResponse(BaseModel):
    id: int
    student_id: int
    proje_adi: str
    aciklama: Optional[str] = None
    github_link: Optional[str] = None
    demo_link: Optional[str] = None
    teknolojiler:      Optional[list]  = None
    proje_buyuklugu:   Optional[int]   = None
    konu:              Optional[str]   = None
    teknik_yetkinlik:  Optional[float] = None
    beceriler:         Optional[float] = None
    gorseller:         Optional[list]  = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Sertifikalar
# ---------------------------------------------------------------------------

class CertificateCreate(BaseModel):
    ad: str
    veren_kurum: Optional[str] = None
    tarih: Optional[date] = None
    dosya_url: Optional[str] = None


class CertificateResponse(BaseModel):
    id: int
    student_id: int
    ad: str
    veren_kurum: Optional[str] = None
    tarih: Optional[date] = None
    dosya_url: Optional[str] = None
    ocr_metin: Optional[str] = None
    dogrulanmis: bool
    ocr_skoru: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Staj Defteri
# ---------------------------------------------------------------------------

class DiaryCreate(BaseModel):
    internship_id: int
    tarih: date
    ham_metin: str


class DiaryResponse(BaseModel):
    id: int
    student_id: int
    internship_id: int
    tarih: date
    ham_metin: Optional[str] = None
    akademik_metin: Optional[str] = None
    llm_isleme_durumu: str
    onaylandi: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Takımlar
# ---------------------------------------------------------------------------

class TeamCreate(BaseModel):
    proje_adi: str
    aciklama: Optional[str] = None
    aranan_yetkinlikler: Optional[list[str]] = None
    max_uye_sayisi: int = 5


class TeamUpdate(BaseModel):
    proje_adi: Optional[str] = None
    aciklama: Optional[str] = None
    aranan_yetkinlikler: Optional[list[str]] = None
    max_uye_sayisi: Optional[int] = None
    durum: Optional[str] = None


class TeamApplicationCreate(BaseModel):
    mesaj: Optional[str] = None


class TeamApplicationDecision(BaseModel):
    durum: str  # kabul | red


class TeamResponse(BaseModel):
    id: int
    lider_id: int
    proje_adi: str
    aciklama: Optional[str] = None
    aranan_yetkinlikler: Optional[list] = None
    max_uye_sayisi: int
    durum: str
    created_at: datetime
    lider: Optional["UserResponse"] = None

    model_config = {"from_attributes": True}


class TeamApplicationResponse(BaseModel):
    id: int
    team_id: int
    applicant_id: int
    mesaj: Optional[str] = None
    durum: str
    created_at: datetime
    applicant: Optional["UserResponse"] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Rozetler
# ---------------------------------------------------------------------------

class BadgeResponse(BaseModel):
    id: int
    ad: str
    aciklama: Optional[str] = None
    ikon_url: Optional[str] = None
    kategori: Optional[str] = None

    model_config = {"from_attributes": True}


class UserBadgeResponse(BaseModel):
    id: int
    badge_id: int
    kazanma_tarihi: datetime
    badge: Optional[BadgeResponse] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Etkinlikler
# ---------------------------------------------------------------------------

class EventCreate(BaseModel):
    baslik: str
    aciklama: Optional[str] = None
    kategori: str
    baslangic_tarihi: datetime
    bitis_tarihi: Optional[datetime] = None
    konum: Optional[str] = None
    kapasite: Optional[int] = None


class EventResponse(BaseModel):
    id: int
    organizator_id: int
    baslik: str
    aciklama: Optional[str] = None
    kategori: str
    baslangic_tarihi: datetime
    bitis_tarihi: Optional[datetime] = None
    konum: Optional[str] = None
    kapasite: Optional[int] = None
    qr_kod: Optional[str] = None
    created_at: datetime
    organizator: Optional["UserResponse"] = None

    model_config = {"from_attributes": True}


class QRCheckinRequest(BaseModel):
    qr_kod: str


# ---------------------------------------------------------------------------
# Şirket profili
# ---------------------------------------------------------------------------

class CompanyProfileResponse(BaseModel):
    id: int
    email: str
    ad: str
    soyad: str
    role: UserRole
    aktif: bool
    created_at: datetime
    internships: list[InternshipResponse] = []

    model_config = {"from_attributes": True}
