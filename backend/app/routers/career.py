# Kariyer haritası endpoint'leri — bölüme göre dinamik radar + gap analizi
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.data.career_data import (
    BOLUMLER, BOLUM_KATEGORILERI, BOLUM_ROL_MAP,
)
from app.database import get_db
from app.models import CV, Certificate, Internship, Portfolio, Roadmap, User, UserRole

router = APIRouter(prefix="/career", tags=["career"])

# Varsayılan bölüm: bolum_kodu yoksa bilgisayar
VARSAYILAN_BOLUM = "bilgisayar"


def _kategoriler(bolum_kodu: str) -> list[str]:
    return BOLUM_KATEGORILERI.get(bolum_kodu or VARSAYILAN_BOLUM, BOLUM_KATEGORILERI[VARSAYILAN_BOLUM])


def _rol_map(bolum_kodu: str) -> dict:
    return BOLUM_ROL_MAP.get(bolum_kodu or VARSAYILAN_BOLUM, BOLUM_ROL_MAP[VARSAYILAN_BOLUM])


def _hesapla_radar(beceriler: list[str], kategoriler: list[str]) -> list[dict]:
    beceri_set = {b.lower() for b in beceriler}
    radar = []
    for kat in kategoriler:
        # Kategori adındaki kelimeleri becerilerle karşılaştır
        kat_words = {w.lower() for w in kat.replace("&", "").split() if len(w) > 2}
        # Aynı zamanda cv'deki becerilerde bu kelimeler geçiyor mu?
        eslesme = sum(1 for b in beceri_set if any(w in b for w in kat_words))
        skor = min(round(eslesme / max(len(kat_words), 1) * 100), 100)
        radar.append({"kategori": kat, "skor": skor})
    return radar


@router.get("/bolumler")
def list_bolumler():
    """Tüm bölüm seçeneklerini döner."""
    return [{"kod": k, "ad": v} for k, v in BOLUMLER.items()]


@router.get("/radar")
def get_radar(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    beceriler = cv.beceriler or [] if cv else []
    bolum_kodu = current_user.bolum_kodu or VARSAYILAN_BOLUM
    kategoriler = _kategoriler(bolum_kodu)
    radar = _hesapla_radar(beceriler, kategoriler)
    return {
        "radar":        radar,
        "bolum_kodu":   bolum_kodu,
        "bolum_adi":    BOLUMLER.get(bolum_kodu, bolum_kodu),
        "beceri_sayisi": len(beceriler),
    }


@router.get("/gap-analysis")
def gap_analysis(
    target_role: str = Query(default=None),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    bolum_kodu = current_user.bolum_kodu or VARSAYILAN_BOLUM
    rol_map = _rol_map(bolum_kodu)

    # target_role gönderilmemişse bölümün ilk rolünü al
    if not target_role or target_role not in rol_map:
        target_role = next(iter(rol_map), None)

    if not target_role:
        return {"hata": "Bu bölüm için rol tanımlanmamış"}

    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    mevcut = {b.lower() for b in (cv.beceriler or [])} if cv else set()
    hedef  = rol_map[target_role]
    hedef_lower = {b.lower(): b for b in hedef}

    eksik = [hedef_lower[b] for b in hedef_lower if b not in mevcut]
    sahip = [hedef_lower[b] for b in hedef_lower if b in mevcut]
    tamamlanma = round(len(sahip) / len(hedef) * 100) if hedef else 0

    return {
        "bolum_kodu":        bolum_kodu,
        "bolum_adi":         BOLUMLER.get(bolum_kodu, bolum_kodu),
        "hedef_rol":         target_role,
        "tamamlanma_yuzdesi": tamamlanma,
        "sahip_olunan":      sahip,
        "eksik_beceriler":   eksik,
        "toplam_gereken":    len(hedef),
    }


@router.get("/roles")
def list_roles(
    current_user: User = Depends(require_role(UserRole.student)),
):
    """Öğrencinin bölümüne göre hedef rolleri döner."""
    bolum_kodu = current_user.bolum_kodu or VARSAYILAN_BOLUM
    rol_map    = _rol_map(bolum_kodu)
    return [
        {"id": rol, "label": rol, "gerekli_beceriler": beceriler}
        for rol, beceriler in rol_map.items()
    ]


@router.put("/skills")
def update_skills(
    beceriler: list[str],
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    if not cv:
        from app.models import CV as CVModel
        cv = CVModel(student_id=current_user.id, beceriler=beceriler)
        db.add(cv)
    else:
        cv.beceriler = beceriler
    db.commit()
    return {"guncellendi": True, "beceri_sayisi": len(beceriler)}


@router.post("/generate-profile")
async def generate_profile(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """
    Portfolyo projeleri + doğrulanmış sertifikalar → Gemini analiz →
    Bölüme göre 8 kategori puanı üret → CV'ye kaydet.
    """
    bolum_kodu = current_user.bolum_kodu or VARSAYILAN_BOLUM
    kategoriler = _kategoriler(bolum_kodu)
    bolum_adi   = BOLUMLER.get(bolum_kodu, bolum_kodu)

    # 1. Portfolyo — teknoloji_degerleri = buyukluk × teknoloji_puani (zaten hesaplanmış)
    projeler = db.query(Portfolio).filter(Portfolio.student_id == current_user.id).all()

    # {teknoloji: toplam_deger} — aynı teknoloji birden fazla projede varsa topla
    teknoloji_deger_map: dict[str, float] = {}
    for p in projeler:
        degerler = p.teknoloji_degerleri or {}
        # Eski projeler için fallback: anlık hesapla
        if not degerler and p.teknoloji_puanlari:
            buyukluk = p.proje_buyuklugu or 5
            degerler = {
                t: round((buyukluk / 100) * (p.teknoloji_puanlari.get(t, 10) / 100) * 100, 1)
                for t in (p.teknolojiler or [])
            }
        for t, v in degerler.items():
            teknoloji_deger_map[t] = teknoloji_deger_map.get(t, 0) + v

    teknolojiler = sorted(teknoloji_deger_map, key=teknoloji_deger_map.get, reverse=True)

    # 2. Doğrulanmış sertifikalar
    sertifikalar = db.query(Certificate).filter(
        Certificate.student_id == current_user.id,
        Certificate.dogrulanmis == True,
    ).all()
    sertifika_isimleri = [s.ad for s in sertifikalar if s.ad]

    # Veri yoksa
    if not teknolojiler and not sertifika_isimleri:
        return {
            "basarili": False,
            "mesaj": "Portfolyonuzda proje teknolojisi veya doğrulanmış sertifika bulunamadı.",
            "radar": [],
        }

    # Kaynakları proje adı + teknoloji + ağırlık eşleşmesiyle oluştur
    kaynaklar = []
    for proje in projeler:
        buyukluk = proje.proje_buyuklugu or 5
        puanlar_p = proje.teknoloji_puanlari or {}
        for t in (proje.teknolojiler or []):
            tek_puani = puanlar_p.get(t, 10)
            kaynaklar.append({
                "tip":         "proje",
                "proje_adi":   proje.proje_adi or "Proje",
                "teknoloji":   t,
                "goster":      f"{proje.proje_adi}: {t}",
                "buyukluk":    buyukluk,
                "tek_puani":   tek_puani,
            })
    for s in sertifikalar:
        if s.ad:
            kaynaklar.append({
                "tip":       "sertifika",
                "proje_adi": "Sertifika",
                "teknoloji": s.ad,
                "goster":    f"Sertifika: {s.ad}",
            })

    kaynak_listesi = "\n".join(
        f"- {k['goster']} [deger={round(teknoloji_deger_map.get(k['teknoloji'], 0), 1)}]"
        if k['tip'] == 'proje'
        else f"- {k['goster']}"
        for k in kaynaklar
    )

    # 3. Gemini prompt
    prompt = f"""Bir {bolum_adi} ogrencisinin kaynaklarini asagidaki kategorilere siniflandir.
SADECE siniflandirma yap, deger atama. Degerler zaten verilmis.

Kaynaklar:
{kaynak_listesi if kaynak_listesi else 'Kaynak yok'}

Her kaynagi asagidaki 8 kategoriden birine veya birden fazlasina atayarak JSON don:

{{
  "siniflandirma": {{
{chr(10).join(f'    "{k}": ["<kaynak1>", "<kaynak2>"],' for k in kategoriler)}
  }}
}}

Kurallar:
- Her kaynagi ilgili kategorilere yaz (aynen kaynaktaki metin)
- Birden fazla kategoriye atanabilir
- Ilgisi yoksa bos liste birak
- Sadece JSON don, aciklama ekleme"""

    # 4. Gemini analiz
    from app.services.llm_service import GEMINI_API_KEY
    import re, json

    puanlar = {k: 0 for k in kategoriler}

    katki_detay = {}  # {kategori: [{kaynak, etki}, ...]}

    # Sertifika değeri sabit: 5
    SERTIFIKA_DEGERI = 5.0

    if GEMINI_API_KEY:
        try:
            from google import genai
            client   = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model="models/gemini-2.5-flash-lite",
                contents=prompt,
            )
            metin = response.text.strip()
            m = re.search(r'\{[\s\S]*\}', metin)
            if m:
                ham = json.loads(m.group(0))
                sinif = ham.get("siniflandirma", {})

                for kat in kategoriler:
                    atanan_kaynaklar = sinif.get(kat, [])
                    katkilar = []
                    toplam = 0.0

                    for kaynak_metni in atanan_kaynaklar:
                        # Sertifika mi proje teknolojisi mi?
                        if "sertifika" in kaynak_metni.lower() or kaynak_metni.startswith("Sertifika:"):
                            etki = SERTIFIKA_DEGERI
                        else:
                            # "ProjeAdi: Teknoloji" formatından teknolojiyi çıkar
                            parcalar = kaynak_metni.split(":")
                            tek_adi = parcalar[-1].strip() if len(parcalar) > 1 else kaynak_metni
                            etki = round(teknoloji_deger_map.get(tek_adi, 0), 1)

                        if etki > 0:
                            katkilar.append({"kaynak": kaynak_metni, "etki": etki})
                            toplam += etki

                    puanlar[kat] = min(100, round(toplam))
                    katki_detay[kat] = katkilar
        except Exception:
            pass

    # 5. Beceri listesini CV'ye kaydet (radar için)
    kazanilan_beceriler = []
    for kat, puan in puanlar.items():
        if puan >= 40:
            kazanilan_beceriler.append(kat)

    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    if not cv:
        cv = CV(student_id=current_user.id, beceriler=kazanilan_beceriler)
        db.add(cv)
    else:
        cv.beceriler = kazanilan_beceriler
    db.commit()

    radar = [
        {
            "kategori": k,
            "skor":     v,
            "katkilar": katki_detay.get(k, []),
        }
        for k, v in puanlar.items()
    ]
    return {
        "basarili":  True,
        "radar":     radar,
        "beceriler": kazanilan_beceriler,
        "kaynaklar": {
            "proje_teknolojileri": teknolojiler,
            "sertifikalar":        sertifika_isimleri,
        },
    }


# ─────────────────────────────────────────────────────────────────
# Yol Haritası endpoint'leri
# ─────────────────────────────────────────────────────────────────

@router.get("/roadmap/ilanlar")
def roadmap_ilanlar(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    """Aktif staj ilanlarını şirket + departman bilgisiyle döner (yol haritası için seçim)."""
    from sqlalchemy.orm import selectinload
    ilanlar = (
        db.query(Internship)
        .options(selectinload(Internship.company))
        .filter(Internship.durum == "aktif")
        .order_by(Internship.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id":          i.id,
            "pozisyon":    i.pozisyon,
            "departman":   i.departman or "",
            "konum":       i.konum or "",
            "bolum_kodu":  i.bolum_kodu or "",
            "sirket_adi":  f"{i.company.ad} {i.company.soyad}".strip() if i.company else "",
            "beceri_profili": i.beceri_profili or {},
        }
        for i in ilanlar
    ]


@router.post("/roadmap/olustur")
async def roadmap_olustur(
    internship_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """
    Seçilen staj ilanına göre AI yol haritası üretir ve DB'ye kaydeder.
    """
    from sqlalchemy.orm import selectinload
    from app.services.llm_service import GEMINI_API_KEY
    from app.data.career_data import BOLUM_KATEGORILERI, BOLUMLER

    # İlanı çek
    ilan = db.query(Internship).options(selectinload(Internship.company)).filter(
        Internship.id == internship_id
    ).first()
    if not ilan:
        from fastapi import HTTPException
        raise HTTPException(404, "İlan bulunamadı")

    sirket_adi = f"{ilan.company.ad} {ilan.company.soyad}".strip() if ilan.company else "Şirket"

    # Öğrencinin mevcut becerileri
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    mevcut_beceriler = cv.beceriler or [] if cv else []
    bolum_adi = BOLUMLER.get(ilan.bolum_kodu or "", "")

    # İlanın aradığı beceri profili
    aranan_profil = ilan.beceri_profili or {}
    aranan_kategoriler = BOLUM_KATEGORILERI.get(ilan.bolum_kodu or "", [])

    # AI Prompt
    prompt = f"""Bir BTU ogrencisi icin kariyer yol haritasi olustur.

Hedef sirket: {sirket_adi}
Hedef departman: {ilan.departman or ilan.pozisyon}
Hedef bolum: {bolum_adi or ilan.bolum_kodu or "Belirsiz"}

Sirkein aradigi beceri kategorileri ve puanlari:
{chr(10).join(f"- {k}: {aranan_profil.get(k, 0)}/100" for k in aranan_kategoriler if aranan_profil.get(k, 0) > 0) or "Belirtilmemis"}

Ogrencinin mevcut becerileri:
{', '.join(mevcut_beceriler) if mevcut_beceriler else 'Henuz belirtilmemis'}

Lutfen asagidakileri iceren kisa ve net bir Turkce yol haritasi olustur:
1. Eksik beceriler ve oncelik sirasi
2. Her beceri icin somut ogrenme adimi (kurs, proje, sertifika)
3. 3 ve 6 aylik hedefler
4. Bu staja hazirlanmak icin tavsiyeler

Madde madde yaz, kisa ve uygulanabilir olsun."""

    # AI çağrısı (Gemini → Groq → OpenAI)
    icerik = ""
    try:
        import os
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        gemini_key = GEMINI_API_KEY

        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
                icerik = r.text.strip()
            except Exception:
                icerik = ""

        if not icerik and groq_key:
            from groq import Groq
            client = Groq(api_key=groq_key)
            r = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            icerik = r.choices[0].message.content.strip()

    except Exception as e:
        icerik = f"[AI hatası: {e}]"

    if not icerik:
        icerik = "Şu an AI servisi kullanılamıyor. Lütfen daha sonra tekrar deneyin."

    # DB'ye kaydet
    yol_haritasi = Roadmap(
        student_id=current_user.id,
        internship_id=ilan.id,
        sirket_adi=sirket_adi,
        departman=ilan.departman or ilan.pozisyon or "",
        bolum_kodu=ilan.bolum_kodu or "",
        icerik=icerik,
    )
    db.add(yol_haritasi)
    db.commit()
    db.refresh(yol_haritasi)

    return {
        "id":           yol_haritasi.id,
        "sirket_adi":   yol_haritasi.sirket_adi,
        "departman":    yol_haritasi.departman,
        "icerik":       yol_haritasi.icerik,
        "created_at":   yol_haritasi.created_at,
    }


@router.get("/roadmap/me")
def my_roadmaps(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrencinin kayıtlı yol haritalarını döner."""
    haritalar = (
        db.query(Roadmap)
        .filter(Roadmap.student_id == current_user.id)
        .order_by(Roadmap.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id":         h.id,
            "sirket_adi": h.sirket_adi,
            "departman":  h.departman,
            "icerik":     h.icerik,
            "created_at": h.created_at,
        }
        for h in haritalar
    ]


@router.delete("/roadmap/{roadmap_id}", status_code=204)
def delete_roadmap(
    roadmap_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException
    h = db.query(Roadmap).filter(Roadmap.id == roadmap_id, Roadmap.student_id == current_user.id).first()
    if not h:
        raise HTTPException(404, "Yol haritası bulunamadı")
    db.delete(h)
    db.commit()
