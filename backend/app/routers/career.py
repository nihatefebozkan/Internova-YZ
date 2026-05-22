# Kariyer haritası endpoint'leri — bölüme göre dinamik radar + gap analizi
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.data.career_data import (
    BOLUMLER, BOLUM_KATEGORILERI, BOLUM_ROL_MAP,
)
from app.database import get_db
from app.models import CV, Certificate, Portfolio, User, UserRole

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
