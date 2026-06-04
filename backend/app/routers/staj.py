# Staj modülü — öğrenci gelişim odaklı endpoint'ler.
# Faz 1: #1 Hazırlık skoru, #2 Sektör & alan keşfi, #3 Kişisel eksik analizi,
#        #5 Anonim staj deneyim paylaşımı
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import (
    Application, ApplicationStatus, Internship,
    StajDeneyim, User, UserRole,
)
from app.schemas import (
    BeceriEklemeRequest, BeceriEklemeResponse, BeceriEkstraksiyonResponse,
    EksikAnaliziResponse, HaftalikGunlukResponse, HazirlikSkoruResponse,
    KapakMektubuRequest, KapakMektubuResponse, MulakatHazirligiResponse,
    SektorKesfiResponse, SirketOnaniziResponse, StajAsistaniBaglam,
    StajAsistaniRequest, StajAsistaniResponse, StajDeneyimAnonim,
    StajDeneyimCreate, StajDeneyimStats,
)
from app.services.beceri_ekstraksiyon import becerileri_cikar, becerileri_ekle
from app.services.eksik_analizi import eksik_analizi
from app.services.haftalik_gunluk import haftalik_gunluk
from app.services.hazirlik_servisi import hazirlik_skoru_hesapla
from app.services.kapak_mektubu import kapak_mektubu_uret
from app.services.mulakat_checklist import mulakat_hazirligi_uret
from app.services.sektor_kesfi import sektor_kesfi
from app.services.sirket_onanaliz import sirket_onanalizi
from app.services.staj_asistani import asistana_sor, DURUM_ASAMA_IPUCU

router = APIRouter(prefix="/staj", tags=["staj"])


@router.get("/hazirlik-skoru", response_model=HazirlikSkoruResponse)
def hazirlik_skoru(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrencinin staj hazırlık skoru (0-100), alt skorlar ve gelişim önerileri.

    Skor 5 kategoriden hesaplanır: Profil (20), CV (25), Portfolio (25),
    Sertifika (15), Aktivite (15). Öneriler katkı puanına göre sıralı döner.
    """
    return hazirlik_skoru_hesapla(db, current_user)


@router.get("/sektor-onerisi", response_model=SektorKesfiResponse)
async def sektor_onerisi(
    ai_yorum: bool = Query(default=True, description="LLM ile kişiye özel yorum üretilsin mi"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Projelerinden hesaplanan alan profiline göre en uygun 3 sektörü döner.

    Kullanıcının `Portfolio.beceri_kategorileri` (6'lı radar) ortalaması 9 sektör
    ağırlığıyla karşılaştırılır. Kavram bonusları (LLM çıkarımı) eklenir.
    `ai_yorum=true` ise Gemini/Groq ile kişiye özel kısa paragraf üretilir.
    """
    return await sektor_kesfi(db, current_user, ai_yorum=ai_yorum)


@router.get("/eksik-analizi", response_model=EksikAnaliziResponse)
def eksik_analizi_endpoint(
    internship_id: int = Query(..., description="Hedeflenen staj ilanı ID'si"),
    ai: bool = Query(default=True, description="LLM ile somut adım ve yorum üretilsin mi"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bir staj ilanına karşı kişisel beceri eksiklik analizi.

    İlan `beceri_profili` (8 kategori, 0-100 hedef değer) ile öğrencinin profili
    (CV.beceriler + Portfolio teknolojileri + kavramları havuzu) karşılaştırılır.
    Her kategoride gap hesaplanır, en büyük 3 boşluk için LLM somut adım üretir.
    """
    internship = db.query(Internship).options(selectinload(Internship.company)).filter(
        Internship.id == internship_id
    ).first()
    if not internship:
        raise HTTPException(404, "Staj ilanı bulunamadı")
    return eksik_analizi(db, current_user, internship, ai=ai)


@router.post("/kapak-mektubu", response_model=KapakMektubuResponse)
async def kapak_mektubu_endpoint(
    body: KapakMektubuRequest,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bir staj ilanı için öğrenciye özel AI kapak mektubu üretir.

    Profil verisi (CV özeti, beceriler, en güçlü 3 proje, doğrulanmış sertifikalar)
    + ilan detayı LLM'e verilir; sonuç düz metin döner. Kalıcı değildir; öğrenci
    metni düzenleyip başvuru anında `on_yazi` olarak gönderir.

    `ton`: resmi | samimi | denge,  `uzunluk`: kisa | orta | uzun.
    """
    internship = db.query(Internship).options(selectinload(Internship.company)).filter(
        Internship.id == body.internship_id
    ).first()
    if not internship:
        raise HTTPException(404, "Staj ilanı bulunamadı")

    return await kapak_mektubu_uret(
        db, current_user, internship,
        ton=body.ton or "denge",
        uzunluk=body.uzunluk or "orta",
        ekstra=body.ekstra_yonerge,
    )


@router.get("/mulakat-hazirligi", response_model=MulakatHazirligiResponse)
async def mulakat_hazirligi_endpoint(
    application_id: int = Query(..., description="Mülakat durumundaki başvurunun ID'si"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Mülakat durumundaki bir başvuru için kişiselleştirilmiş hazırlık checklist'i.

    4 kategoride 12-16 somut madde üretir: Teknik / Şirket Araştırması /
    Olası Sorular / Lojistik. Önkoşul: başvuru `mulakat` durumunda olmalı.
    """
    basvuru = (
        db.query(Application)
        .options(selectinload(Application.internship).selectinload(Internship.company))
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")
    if basvuru.durum != ApplicationStatus.mulakat.value:
        raise HTTPException(400, f"Bu başvuru 'mulakat' durumunda değil (şu an: {basvuru.durum})")

    return await mulakat_hazirligi_uret(db, current_user, basvuru)


@router.get("/haftalik-gunluk", response_model=HaftalikGunlukResponse)
async def haftalik_gunluk_endpoint(
    application_id: int = Query(..., description="Kabul edilmiş başvurunun ID'si"),
    ai: bool = Query(default=True, description="LLM ile haftalık özet üretilsin mi"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bir stajın günlük girişlerini ISO haftalara grupla, her hafta için AI özet üret.

    Önkoşul: başvuru `kabul` durumunda olmalı (staj başlamış).
    `ai=false` ile sadece haftalık gruplama döner (hızlı).
    """
    basvuru = (
        db.query(Application)
        .options(selectinload(Application.internship).selectinload(Internship.company))
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")
    if basvuru.durum != ApplicationStatus.kabul.value:
        raise HTTPException(400, f"Sadece kabul edilmiş başvurularda haftalık günlük olur (şu an: {basvuru.durum})")

    return await haftalik_gunluk(db, current_user, basvuru, ai=ai)


@router.get("/becerileri-cikar", response_model=BeceriEkstraksiyonResponse)
async def becerileri_cikar_endpoint(
    application_id: int = Query(..., description="Kabul edilmiş başvurunun ID'si"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Diary girişlerinden AI ile beceri çıkar — kullanıcının onayına sunulur.

    Çıkan beceriler `zaten_var` flag'i ile döner; sadece güveni 0.5+ olanlar dahil.
    Mutlak otomatik eklenmez; öğrenci POST /staj/becerileri-ekle ile onaylar.
    """
    basvuru = (
        db.query(Application)
        .options(selectinload(Application.internship))
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")
    if basvuru.durum != ApplicationStatus.kabul.value:
        raise HTTPException(400, f"Sadece kabul edilmiş başvurularda beceri çıkarımı yapılır (şu an: {basvuru.durum})")

    return await becerileri_cikar(db, current_user, basvuru.internship_id)


@router.post("/becerileri-ekle", response_model=BeceriEklemeResponse)
def becerileri_ekle_endpoint(
    body: BeceriEklemeRequest,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Kullanıcının onayladığı becerileri CV.beceriler'e merge eder.

    Mevcut becerilerle case-insensitive karşılaştırma yapılır; duplikatlar
    `atlananlar` listesinde döner.
    """
    if not body.beceriler:
        raise HTTPException(400, "En az 1 beceri seçilmeli")
    return becerileri_ekle(db, current_user, body.beceriler)


# ────────────────────────────────────────────────────────────────────────────
# Faz 3 #15 — Kariyer Asistanı Staj Modu
# ────────────────────────────────────────────────────────────────────────────

# Aşamaya göre hızlı soru önerileri — frontend sidebar'ı için
ASAMA_HIZLI_SORULAR = {
    "bekleyen": [
        "Bekleme süresinde profilimi nasıl güçlendirebilirim?",
        "Bu şirketle ilgili ne öğrenmeliyim?",
        "Başvurum ne kadar sürede yanıtlanır genelde?",
    ],
    "inceleniyor": [
        "İnceleme sürecinde ne yapmalıyım?",
        "Mülakata hazırlanmaya başlamalı mıyım?",
        "Şirketin teknolojilerine pratik mi başlasam?",
    ],
    "mulakat": [
        "Bu pozisyon için ne tür sorular gelir?",
        "Şirkete sormam gereken sorular neler?",
        "Mülakat öncesi 1 saat ne yapmalıyım?",
        "Maaş/yan haklar konusu nasıl açılmalı?",
    ],
    "kabul": [
        "İlk hafta neye odaklanmalıyım?",
        "Mentor'umdan ne istemeliyim?",
        "Bu projedeki katkımı nasıl artırırım?",
        "Staj defterimi nasıl daha iyi yazarım?",
    ],
    "red": [
        "Geri bildirim nasıl isteyebilirim?",
        "Benzer pozisyonlara nasıl yönelmeliyim?",
        "Hangi becerilerimi geliştirmeliyim?",
    ],
}


@router.get("/asistan/baglam", response_model=list[StajAsistaniBaglam])
def asistan_baglamlari(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrencinin aktif başvurularını staj asistanı seçici için döner.

    Sadece sonuçlanmış (red dışı) başvurular gelir — her birine özel
    aşama açıklaması + hızlı soru önerileri eklenir.
    """
    basvurular = (
        db.query(Application)
        .options(selectinload(Application.internship).selectinload(Internship.company))
        .filter(
            Application.student_id == current_user.id,
            Application.durum != ApplicationStatus.red.value,
        )
        .order_by(Application.basvuru_tarihi.desc())
        .all()
    )

    sonuc = []
    for a in basvurular:
        if not a.internship:
            continue
        sonuc.append(StajAsistaniBaglam(
            application_id=a.id,
            internship_id=a.internship_id,
            pozisyon=a.internship.pozisyon,
            sirket_adi=getattr(a.internship.company, "ad", None) if a.internship.company else None,
            durum=a.durum,
            asama_aciklama=DURUM_ASAMA_IPUCU.get(a.durum),
            hizli_sorular=ASAMA_HIZLI_SORULAR.get(a.durum, []),
        ))
    return sonuc


@router.post("/asistan", response_model=StajAsistaniResponse)
async def asistan_sor_endpoint(
    body: StajAsistaniRequest,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Aktif başvuru bağlamında staj asistanına soru sor.

    Şirket adı, pozisyon, durum (bekleyen/inceleniyor/mulakat/kabul) ve
    kabul ise son diary girişleri LLM'e bağlam olarak verilir.
    """
    if not body.soru.strip():
        raise HTTPException(400, "Soru boş olamaz")

    basvuru = (
        db.query(Application)
        .options(selectinload(Application.internship).selectinload(Internship.company))
        .filter(Application.id == body.application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")

    return await asistana_sor(db, current_user, body.soru, basvuru)


@router.get("/sirket-onanaliz", response_model=SirketOnaniziResponse)
async def sirket_onanaliz_endpoint(
    company_id: int = Query(..., description="Şirket (User.role=company) ID'si"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bir şirket için eski stajyer diary + anonim deneyim agregasyonu üzerinden
    LLM ile önanaliz: muhtemel teknolojiler, yaygın işler, kültür ipuçları, uyarılar.

    Yetersiz veri durumunda nazik hata mesajı döner (gerçek değerleriyle).
    """
    company = db.query(User).filter(
        User.id == company_id, User.role == UserRole.company
    ).first()
    if not company:
        raise HTTPException(404, "Şirket bulunamadı")
    return await sirket_onanalizi(db, company)


# ────────────────────────────────────────────────────────────────────────────
# Faz 1 #5 — Anonim Staj Deneyim Paylaşımı
# ────────────────────────────────────────────────────────────────────────────

def _anonim_doldur(d: StajDeneyim, current_user_id: int | None = None) -> dict:
    """SQLAlchemy obj → API'de döndürülecek anonim dict. paylasan_id YOK."""
    return {
        "id": d.id,
        "company_id": d.company_id,
        "bolum_kodu": d.bolum_kodu,
        "donem": d.donem,
        "calistigi_departman": d.calistigi_departman,
        "genel_yorum": d.genel_yorum,
        "ogrendigi_teknolojiler": d.ogrendigi_teknolojiler or [],
        "puan": d.puan,
        "tavsiye_eder_mi": d.tavsiye_eder_mi,
        "created_at": d.created_at,
        "benim_mi": current_user_id is not None and d.paylasan_id == current_user_id,
    }


@router.post("/deneyim", response_model=StajDeneyimAnonim, status_code=201)
def deneyim_paylas(
    body: StajDeneyimCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bir şirket için staj deneyimi paylaş. Sadece o şirkette kabul edilmiş
    başvurusu olan öğrenci paylaşabilir. Aynı dönemde aynı şirkete tek paylaşım."""
    # Şirket var ve gerçekten company mı?
    company = db.query(User).filter(User.id == body.company_id, User.role == UserRole.company).first()
    if not company:
        raise HTTPException(404, "Şirket bulunamadı")

    # Kullanıcının bu şirkette kabul edilmiş bir başvurusu olmalı
    application = (
        db.query(Application)
        .join(Internship, Application.internship_id == Internship.id)
        .filter(
            Application.student_id == current_user.id,
            Internship.company_id == body.company_id,
            Application.durum == ApplicationStatus.kabul,
        )
        .order_by(Application.karar_tarihi.desc().nullslast())
        .first()
    )
    if not application:
        raise HTTPException(403, "Bu şirkette kabul edilmiş başvurun yok — deneyim paylaşamazsın")

    if body.puan is not None and not 1 <= body.puan <= 5:
        raise HTTPException(400, "Puan 1-5 arası olmalı")

    deneyim = StajDeneyim(
        company_id=body.company_id,
        paylasan_id=current_user.id,
        application_id=application.id,
        bolum_kodu=current_user.bolum_kodu,
        donem=body.donem,
        calistigi_departman=body.calistigi_departman,
        genel_yorum=body.genel_yorum,
        ogrendigi_teknolojiler=body.ogrendigi_teknolojiler or [],
        puan=body.puan,
        tavsiye_eder_mi=body.tavsiye_eder_mi,
    )
    db.add(deneyim)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(400, "Bu dönem için zaten bir paylaşımın var")
    db.refresh(deneyim)
    return _anonim_doldur(deneyim, current_user.id)


@router.get("/deneyim", response_model=list[StajDeneyimAnonim])
def deneyim_listele(
    company_id: int = Query(..., description="Hangi şirketin deneyimleri"),
    bolum_kodu: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bir şirketin anonim staj deneyimlerini listele (en yeni → en eski)."""
    q = db.query(StajDeneyim).filter(
        StajDeneyim.company_id == company_id,
        StajDeneyim.onay_durumu == "onayli",
    )
    if bolum_kodu:
        q = q.filter(StajDeneyim.bolum_kodu == bolum_kodu)
    deneyimler = q.order_by(StajDeneyim.created_at.desc()).all()
    return [_anonim_doldur(d, current_user.id) for d in deneyimler]


@router.get("/deneyim/me", response_model=list[StajDeneyimAnonim])
def deneyim_benim(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Kullanıcının kendi paylaştıkları — benim_mi=True döner."""
    deneyimler = (
        db.query(StajDeneyim)
        .filter(StajDeneyim.paylasan_id == current_user.id)
        .order_by(StajDeneyim.created_at.desc())
        .all()
    )
    return [_anonim_doldur(d, current_user.id) for d in deneyimler]


@router.get("/deneyim/stats/{company_id}", response_model=StajDeneyimStats)
def deneyim_stats(
    company_id: int,
    db: Session = Depends(get_db),
):
    """Bir şirketin agregat istatistikleri — ortalama puan, tavsiye %, top teknolojiler."""
    deneyimler = db.query(StajDeneyim).filter(
        StajDeneyim.company_id == company_id,
        StajDeneyim.onay_durumu == "onayli",
    ).all()
    toplam = len(deneyimler)
    ort_puan = None
    tavsiye_yuzde = None
    sayac = Counter()

    if toplam:
        puanlilar = [d.puan for d in deneyimler if d.puan]
        if puanlilar:
            ort_puan = round(sum(puanlilar) / len(puanlilar), 1)
        tavsiye_say = sum(1 for d in deneyimler if d.tavsiye_eder_mi is True)
        cevaplilar  = sum(1 for d in deneyimler if d.tavsiye_eder_mi is not None)
        if cevaplilar:
            tavsiye_yuzde = round(tavsiye_say / cevaplilar * 100)
        for d in deneyimler:
            for t in (d.ogrendigi_teknolojiler or []):
                if isinstance(t, str):
                    sayac[t.strip()] += 1

    return StajDeneyimStats(
        company_id=company_id,
        toplam_paylasim=toplam,
        ortalama_puan=ort_puan,
        tavsiye_yuzdesi=tavsiye_yuzde,
        en_cok_teknoloji=[t for t, _ in sayac.most_common(5)],
    )


@router.delete("/deneyim/{deneyim_id}", status_code=204)
def deneyim_sil(
    deneyim_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Sadece kendi paylaşımını silebilirsin."""
    d = db.query(StajDeneyim).filter(StajDeneyim.id == deneyim_id).first()
    if not d:
        raise HTTPException(404, "Deneyim bulunamadı")
    if d.paylasan_id != current_user.id:
        raise HTTPException(403, "Sadece kendi paylaşımını silebilirsin")
    db.delete(d)
    db.commit()
