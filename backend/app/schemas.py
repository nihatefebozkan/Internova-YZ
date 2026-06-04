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
    github_username: Optional[str] = None
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
    github_username: Optional[str] = None


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
    durum: ApplicationStatus              # 5 değerden biri
    not_: Optional[str] = None            # şirketin isteğe bağlı notu (timeline'da görünür)


class ApplicationBulkDecision(BaseModel):
    application_ids: list[int]
    durum: ApplicationStatus
    not_: Optional[str] = None


class ApplicationBulkResult(BaseModel):
    basarili: list[int]
    atlanan: list[dict]                   # [{id, sebep}]


class AdaySiralamaItem(BaseModel):
    application_id: int
    student_id: int
    ad_soyad: Optional[str] = None
    bolum: Optional[str] = None
    durum: str
    uyum_yuzdesi: int                    # 0-100
    en_guclu_kategori: Optional[str] = None
    en_zayif_kategori: Optional[str] = None
    basvuru_tarihi: Optional[datetime] = None


class DurumGecmisItem(BaseModel):
    id: int
    eski_durum: Optional[str] = None
    yeni_durum: str
    not_: Optional[str] = None
    created_at: datetime
    degistiren_ad: Optional[str] = None   # frontend için anonim/şirket adı

    model_config = {"from_attributes": True}


class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    internship_id: int
    durum: ApplicationStatus
    basvuru_tarihi: datetime
    karar_tarihi: Optional[datetime] = None
    on_yazi: Optional[str] = None
    tamamlandi: bool = False
    created_at: datetime
    student: Optional[UserResponse] = None
    internship: Optional[InternshipResponse] = None
    durum_gecmis: list[DurumGecmisItem] = []

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
    analiz_durumu:     Optional[str]   = None
    katki_analizi:     Optional[dict]  = None
    mimari:               Optional[dict]  = None
    seviye:               Optional[str]   = None
    saglik:               Optional[dict]  = None
    kavramlar:            Optional[list]  = None
    beceri_kategorileri:  Optional[dict]  = None
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


# ---------------------------------------------------------------------------
# Skill Tags & User Skills
# ---------------------------------------------------------------------------

class SkillTagResponse(BaseModel):
    id: int
    ad: str
    slug: str
    kategori: Optional[str] = None
    model_config = {"from_attributes": True}


class SkillTagCreate(BaseModel):
    ad: str
    kategori: Optional[str] = None


class UserSkillItem(BaseModel):
    skill_tag_id: int
    seviye: int = 3


class UserSkillsUpdate(BaseModel):
    skills: list[UserSkillItem]


class UserSkillResponse(BaseModel):
    id: int
    seviye: int
    skill: SkillTagResponse
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------

class GroupCreate(BaseModel):
    ad: str
    aciklama: Optional[str] = None
    kapak_url: Optional[str] = None
    kategori: Optional[str] = None
    max_uye: int = 10
    acik: bool = True


class GroupUpdate(BaseModel):
    ad: Optional[str] = None
    aciklama: Optional[str] = None
    kapak_url: Optional[str] = None
    kategori: Optional[str] = None
    max_uye: Optional[int] = None
    acik: Optional[bool] = None


class GroupMemberItem(BaseModel):
    id: int
    user_id: int
    rol: str
    katilim_tarihi: datetime
    user: Optional[UserResponse] = None
    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: int
    ad: str
    aciklama: Optional[str] = None
    kapak_url: Optional[str] = None
    kategori: Optional[str] = None
    max_uye: int
    owner_id: int
    acik: bool
    created_at: datetime
    owner: Optional[UserResponse] = None
    uye_sayisi: int = 0
    model_config = {"from_attributes": True}


class GroupDetailResponse(GroupResponse):
    memberships: list[GroupMemberItem] = []


class GroupJoinRequestCreate(BaseModel):
    mesaj: Optional[str] = None


class GroupJoinRequestResponse(BaseModel):
    id: int
    group_id: int
    user_id: int
    mesaj: Optional[str] = None
    durum: str
    created_at: datetime
    user: Optional[UserResponse] = None
    model_config = {"from_attributes": True}


class GroupJoinRequestDecision(BaseModel):
    durum: str  # kabul / red


class GroupMemberRoleUpdate(BaseModel):
    rol: str  # moderator / member


# ---------------------------------------------------------------------------
# Projects + Departments
# ---------------------------------------------------------------------------

class DepartmentCreate(BaseModel):
    ad: str
    gereken_kisi: int = 1
    beklentiler: Optional[str] = None
    beceri_etiketleri: list[str] = []


class DepartmentResponse(BaseModel):
    id: int
    project_id: int
    ad: str
    gereken_kisi: int
    beklentiler: Optional[str] = None
    beceri_etiketleri: Optional[list[str]] = None
    dolu_sayisi: int = 0
    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    ad: str
    kisa_aciklama: Optional[str] = None
    kategori: Optional[str] = None
    sure: Optional[str] = None
    seviye: Optional[str] = None
    hedef: Optional[str] = None
    haftalik_saat: Optional[int] = None
    github_var: bool = False
    pitch: Optional[str] = None
    gereksinimler: Optional[str] = None
    departments: list[DepartmentCreate] = []


class ProjectUpdate(BaseModel):
    ad: Optional[str] = None
    kisa_aciklama: Optional[str] = None
    kategori: Optional[str] = None
    sure: Optional[str] = None
    seviye: Optional[str] = None
    hedef: Optional[str] = None
    haftalik_saat: Optional[int] = None
    github_var: Optional[bool] = None
    pitch: Optional[str] = None
    gereksinimler: Optional[str] = None
    durum: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    group_id: int
    owner_id: int
    ad: str
    kisa_aciklama: Optional[str] = None
    kategori: Optional[str] = None
    sure: Optional[str] = None
    seviye: Optional[str] = None
    hedef: Optional[str] = None
    haftalik_saat: Optional[int] = None
    github_var: bool
    pitch: Optional[str] = None
    gereksinimler: Optional[str] = None
    durum: str
    created_at: datetime
    departments: list[DepartmentResponse] = []
    group_ad: Optional[str] = None
    owner_ad: Optional[str] = None
    model_config = {"from_attributes": True}


class DepartmentApplicationCreate(BaseModel):
    mesaj: Optional[str] = None


class DepartmentApplicationDecision(BaseModel):
    durum: str  # kabul / red


class DepartmentApplicationResponse(BaseModel):
    id: int
    department_id: int
    applicant_id: int
    mesaj: Optional[str] = None
    durum: str
    created_at: datetime
    applicant: Optional[UserResponse] = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Group Messages
# ---------------------------------------------------------------------------

class GroupMessageResponse(BaseModel):
    id: int
    group_id: int
    sender_id: int
    icerik: str
    created_at: datetime
    edited_at: Optional[datetime] = None
    sender: Optional[UserResponse] = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

class DiscoveryResponse(BaseModel):
    groups: list[GroupResponse] = []
    projects: list[ProjectResponse] = []


# ---------------------------------------------------------------------------
# Staj — Hazırlık Skoru (Faz 1 #1)
# ---------------------------------------------------------------------------

class HazirlikAltSkor(BaseModel):
    kategori: str
    skor: int
    max: int
    ikon: Optional[str] = None


class HazirlikOnerisi(BaseModel):
    baslik: str
    puan: int
    yol: Optional[str] = None   # frontend route


class HazirlikSkoruResponse(BaseModel):
    toplam_skor: int             # 0-100
    seviye: str                  # hazir / iyi_yolda / gelisiyor / baslangic
    mesaj: str
    alt_skorlar: list[HazirlikAltSkor]
    oneriler: list[HazirlikOnerisi]


# ---------------------------------------------------------------------------
# Staj — Sektör & Alan Keşfi (Faz 1 #2)
# ---------------------------------------------------------------------------

class SektorOnerisi(BaseModel):
    kod: str
    ad: str
    ikon: Optional[str] = None
    uyum: int                 # 0-100
    aciklama: Optional[str] = None
    sonraki_adimlar: list[str] = []


class SektorKesfiResponse(BaseModel):
    yeterli_veri: bool
    mesaj: str
    kullanici_profili: Optional[dict] = None   # {kategori: 0-100}
    en_guclu_alan: Optional[str] = None
    en_zayif_alan: Optional[str] = None
    sektor_onerileri: list[SektorOnerisi] = []
    ai_yorum: Optional[str] = None


# ---------------------------------------------------------------------------
# Staj — Kişisel Eksik Analizi (Faz 1 #3)
# ---------------------------------------------------------------------------

class GapItem(BaseModel):
    kategori: str
    hedef: int            # 0-100
    mevcut: int           # 0-100
    fark: int             # max(0, hedef-mevcut)
    seviye: str           # tam | kismi | eksik


class SomutAdim(BaseModel):
    gap_kategori: str
    adim: str
    tahmini_sure: Optional[str] = None
    puan_kazanci: Optional[int] = None


class EksikAnaliziResponse(BaseModel):
    internship_id: int
    pozisyon: str
    sirket_adi: Optional[str] = None
    tamamlanma_yuzdesi: int            # 0-100
    gap_analizi: list[GapItem] = []
    en_buyuk_gaplar: list[str] = []
    somut_adimlar: list[SomutAdim] = []
    ai_yorum: Optional[str] = None
    uyari: Optional[str] = None


# ---------------------------------------------------------------------------
# Staj — Anonim Deneyim Paylaşımı (Faz 1 #5)
# ---------------------------------------------------------------------------

class StajDeneyimCreate(BaseModel):
    company_id: int
    donem: str                                  # "2026-Yaz"
    calistigi_departman: Optional[str] = None
    genel_yorum: str
    ogrendigi_teknolojiler: list[str] = []
    puan: Optional[int] = None                  # 1-5
    tavsiye_eder_mi: Optional[bool] = None


class StajDeneyimAnonim(BaseModel):
    """API'de döndürülen anonim görünüm — paylasan_id YOK."""
    id: int
    company_id: int
    bolum_kodu: Optional[str] = None
    donem: Optional[str] = None
    calistigi_departman: Optional[str] = None
    genel_yorum: str
    ogrendigi_teknolojiler: Optional[list] = None
    puan: Optional[int] = None
    tavsiye_eder_mi: Optional[bool] = None
    created_at: datetime
    benim_mi: bool = False                      # frontend silme butonu için

    model_config = {"from_attributes": True}


class StajDeneyimStats(BaseModel):
    company_id: int
    toplam_paylasim: int
    ortalama_puan: Optional[float] = None        # 0.0-5.0
    tavsiye_yuzdesi: Optional[int] = None        # 0-100
    en_cok_teknoloji: list[str] = []             # frekansa göre top 5


# ---------------------------------------------------------------------------
# Staj — AI Kapak Mektubu (Faz 2 #7)
# ---------------------------------------------------------------------------

class KapakMektubuRequest(BaseModel):
    internship_id: int
    ton: Optional[str] = "denge"           # resmi | samimi | denge
    uzunluk: Optional[str] = "orta"        # kisa | orta | uzun
    ekstra_yonerge: Optional[str] = None   # "şu projemden bahset" gibi serbest input


class KapakMektubuResponse(BaseModel):
    basarili: bool
    metin: Optional[str] = None
    kullanilan_model: Optional[str] = None    # gemini / groq / openai
    kelime_sayisi: int = 0
    hata: Optional[str] = None
    uyarilar: list[str] = []


# ---------------------------------------------------------------------------
# Staj — Mülakat Hazırlık Checklist (Faz 2 #9)
# ---------------------------------------------------------------------------

class MulakatMaddesi(BaseModel):
    baslik: str
    neden: Optional[str] = None


class MulakatKategorisi(BaseModel):
    ad: str
    ikon: Optional[str] = None
    maddeler: list[MulakatMaddesi] = []


class MulakatHazirligiResponse(BaseModel):
    basarili: bool
    pozisyon: Optional[str] = None
    sirket_adi: Optional[str] = None
    kategoriler: list[MulakatKategorisi] = []
    genel_tavsiye: Optional[str] = None
    kullanilan_model: Optional[str] = None
    hata: Optional[str] = None


# ---------------------------------------------------------------------------
# Staj — Haftalık Öğrenme Günlüğü (Faz 3 #12)
# ---------------------------------------------------------------------------

class HaftalikGirisItem(BaseModel):
    id: int
    tarih: Optional[str] = None
    ham_metin: str = ""
    akademik_metin: str = ""
    llm_isleme_durumu: str
    onaylandi: bool = False


class HaftalikItem(BaseModel):
    yil_hafta: str                  # "2026-W22"
    baslangic: str                  # "2026-05-25"
    bitis: str                      # "2026-05-31"
    giris_sayisi: int
    girisler: list[HaftalikGirisItem] = []
    ana_konular: list[str] = []
    ozet: Optional[str] = None
    ai_basarili: bool = False
    ai_model: Optional[str] = None


class HaftalikGunlukResponse(BaseModel):
    application_id: int
    internship_id: int
    pozisyon: Optional[str] = None
    sirket_adi: Optional[str] = None
    toplam_giris: int = 0
    toplam_hafta: int = 0
    haftalar: list[HaftalikItem] = []


# ---------------------------------------------------------------------------
# Staj — Otomatik Beceri Ekstraksiyonu (Faz 3 #13)
# ---------------------------------------------------------------------------

class BeceriOnerisi(BaseModel):
    ad: str
    guven: float                          # 0-1
    kategori: Optional[str] = None        # dil/framework/veritabanı/araç/kavram/bulut/diğer
    kaynak_tarihler: list[str] = []
    zaten_var: bool = False


class BeceriEkstraksiyonResponse(BaseModel):
    basarili: bool
    kullanilan_model: Optional[str] = None
    toplam_giris: int = 0
    onerilen_beceriler: list[BeceriOnerisi] = []
    hata: Optional[str] = None


class BeceriEklemeRequest(BaseModel):
    beceriler: list[str]                  # Eklenecek beceri adları


class BeceriEklemeResponse(BaseModel):
    eklenenler: list[str]
    atlananlar: list[str]                 # zaten var olanlar
    toplam_beceri_sayisi: int             # CV'de toplam beceri sayısı


# ---------------------------------------------------------------------------
# Staj — Asistan Staj Modu (Faz 3 #15)
# ---------------------------------------------------------------------------

class StajAsistaniRequest(BaseModel):
    soru: str
    application_id: int                   # Hangi başvuru bağlamında soruyor


class StajAsistaniResponse(BaseModel):
    basarili: bool
    yanit: Optional[str] = None
    kullanilan_model: Optional[str] = None
    asama: Optional[str] = None           # bekleyen/inceleniyor/mulakat/kabul/red
    hata: Optional[str] = None


class StajAsistaniBaglam(BaseModel):
    """Frontend için aktif başvuru özeti — staj modu seçicide gösterilir."""
    application_id: int
    internship_id: int
    pozisyon: Optional[str] = None
    sirket_adi: Optional[str] = None
    durum: str
    asama_aciklama: Optional[str] = None
    hizli_sorular: list[str] = []


# ---------------------------------------------------------------------------
# Staj — Şirket Önanalizi (Faz 3 #11)
# ---------------------------------------------------------------------------

class SirketOnaniziResponse(BaseModel):
    basarili: bool
    company_id: int
    sirket_adi: Optional[str] = None

    # Meta — şeffaflık için: veri kaynağı boyutu
    ogrenci_sayisi: int = 0                  # tamamlanmış staj sayısı
    deneyim_sayisi: int = 0                  # anonim deneyim paylaşımı sayısı
    ortalama_puan: Optional[float] = None    # 0-5
    tavsiye_yuzdesi: Optional[int] = None    # 0-100

    # LLM çıktısı
    muhtemel_teknolojiler: list[str] = []
    yaygin_isler: list[str] = []
    is_kulturu_ipuclari: list[str] = []
    uyari_noktalari: list[str] = []
    ozet: Optional[str] = None

    kullanilan_model: Optional[str] = None
    hata: Optional[str] = None


# ---------------------------------------------------------------------------
# Staj — Dijital Evrak Akışı (Faz 3 #14)
# ---------------------------------------------------------------------------

class StajEvrakResponse(BaseModel):
    id: int
    application_id: int
    yukleyen_id: Optional[int] = None
    yukleyen_ad: Optional[str] = None
    ad: str
    tip: str
    dosya_url: Optional[str] = None
    dosya_adi: Optional[str] = None
    durum: str
    onaylayan_id: Optional[int] = None
    onaylayan_ad: Optional[str] = None
    onay_notu: Optional[str] = None
    onay_tarihi: Optional[datetime] = None
    created_at: datetime

    # Bağlam (frontend'in API çağrısı azalsın diye)
    pozisyon: Optional[str] = None
    sirket_adi: Optional[str] = None
    ogrenci_ad: Optional[str] = None
    ogrenci_bolum: Optional[str] = None

    model_config = {"from_attributes": True}


class EvrakOnayRequest(BaseModel):
    durum: str                        # onayli | red
    onay_notu: Optional[str] = None
