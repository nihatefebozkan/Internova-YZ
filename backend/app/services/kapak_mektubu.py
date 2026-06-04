"""AI kapak mektubu üreteci.

Öğrencinin profili (CV özet, beceriler, en güçlü portfolio projeleri, sertifikalar)
ile staj ilanının detayları (pozisyon, departman, şirket adı, gereksinimler,
beceri profili) birleştirilip LLM'e özelleştirilmiş kapak mektubu yazdırılır.

Cascade: Gemini → Groq → OpenAI → hata.
Çıktı düz metin (markdown değil).
"""
import os
from typing import Optional
from sqlalchemy.orm import Session

from app.models import CV, Certificate, Internship, Portfolio, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()

TON_ETIKETI = {
    "resmi":  "resmi, mesafeli ama saygılı",
    "samimi": "sıcak, samimi ama profesyonel",
    "denge":  "profesyonel ve içten, dengeli",
}

UZUNLUK_KELIME = {
    "kisa": "120-180 kelime",
    "orta": "180-260 kelime",
    "uzun": "260-360 kelime",
}


# ────────────────────────────────────────────────────────────────────────────
# Bağlam toplama
# ────────────────────────────────────────────────────────────────────────────

def _ogrenci_baglami(db: Session, user: User) -> dict:
    cv = db.query(CV).filter(CV.student_id == user.id).first()
    projeler = db.query(Portfolio).filter(Portfolio.student_id == user.id).all()
    certs = db.query(Certificate).filter(Certificate.student_id == user.id).all()

    # En değerli 3 projeyi seç (teknik_yetkinlik'e göre)
    en_iyi_projeler = sorted(projeler, key=lambda p: p.teknik_yetkinlik or 0, reverse=True)[:3]
    proje_ozetleri = []
    for p in en_iyi_projeler:
        ad = p.proje_adi or "İsimsiz proje"
        teks = (p.teknolojiler or [])[:6]
        konu = p.konu or "—"
        kavramlar = (p.kavramlar or [])[:4]
        proje_ozetleri.append({
            "ad": ad,
            "konu": konu,
            "teknolojiler": teks,
            "kavramlar": kavramlar,
        })

    # Doğrulanmış sertifikalar
    dogrulanmis = [c.ad for c in certs if c.dogrulanmis and c.ad][:5]

    return {
        "ad_soyad":  f"{user.ad} {user.soyad}".strip(),
        "bolum":     user.bolum or "—",
        "cv_ozet":   (cv.ozet or "").strip()[:600] if cv else "",
        "beceriler": (cv.beceriler or [])[:15] if cv else [],
        "diller":    cv.diller if cv and cv.diller else [],
        "projeler":  proje_ozetleri,
        "sertifikalar": dogrulanmis,
        "github":    user.github_username or None,
    }


def _ilan_baglami(internship: Internship) -> dict:
    return {
        "pozisyon":      internship.pozisyon,
        "departman":     internship.departman,
        "sirket_adi":    getattr(internship.company, "ad", None) if internship.company else None,
        "aciklama":      (internship.aciklama or "").strip()[:500],
        "gereksinimler": (internship.gereksinimler or "").strip()[:400],
        "beceri_profili": internship.beceri_profili or {},
        "konum":         internship.konum,
    }


# ────────────────────────────────────────────────────────────────────────────
# Prompt
# ────────────────────────────────────────────────────────────────────────────

def _prompt_olustur(ogrenci: dict, ilan: dict, ton: str, uzunluk: str, ekstra: Optional[str]) -> str:
    ton_metni = TON_ETIKETI.get(ton, TON_ETIKETI["denge"])
    uz_metni  = UZUNLUK_KELIME.get(uzunluk, UZUNLUK_KELIME["orta"])

    proje_text = "\n".join(
        f"- {p['ad']}: {p['konu']}, teknolojiler: {', '.join(p['teknolojiler']) or '—'}; kavramlar: {', '.join(p['kavramlar']) or '—'}"
        for p in ogrenci["projeler"]
    ) or "(proje yok)"

    bp_text = ", ".join(f"{k}={v}" for k, v in ilan["beceri_profili"].items()) or "—"
    ek_yonerge = f"\nEK İSTEK: {ekstra.strip()}\n" if ekstra else ""

    return f"""Bir öğrencinin staj başvurusu için ÖZELLEŞTİRİLMİŞ, dolu, klişe olmayan bir kapak mektubu yaz.

ÖĞRENCİ
- Ad: {ogrenci['ad_soyad']}
- Bölüm: {ogrenci['bolum']}
- CV özeti: {ogrenci['cv_ozet'] or '(yok)'}
- En çok kullandığı beceriler: {', '.join(ogrenci['beceriler']) or '—'}
- Diller: {ogrenci['diller'] or '—'}
- Doğrulanmış sertifikalar: {', '.join(ogrenci['sertifikalar']) or '—'}
- En değerli projeler:
{proje_text}
- GitHub: @{ogrenci['github']}{'' if ogrenci['github'] else ' (yok)'}

İLAN
- Pozisyon: {ilan['pozisyon']}
- Departman: {ilan['departman'] or '—'}
- Şirket: {ilan['sirket_adi'] or '—'}
- Konum: {ilan['konum'] or '—'}
- Açıklama: {ilan['aciklama'] or '—'}
- Gereksinimler: {ilan['gereksinimler'] or '—'}
- Aranan beceri profili (kategori puanları): {bp_text}

TALİMATLAR
- Ton: {ton_metni}
- Uzunluk: {uz_metni}
- Türkçe, doğal akış, 3-5 paragraf
- GENEL DEĞİL: öğrencinin SPESİFİK projelerine ve ilanın SPESİFİK gereksinimlerine atıf yap
- Şirket adı geçiyorsa SOMUT olarak adını kullan, generic 'firmanız' deme
- Klişe başlamalardan kaçın: "İyi günler / saygılarımla başlamak için..." gibi kalıp giriş YOK
- Asla "Bilgisayar mühendisi olarak başvuruyorum" gibi tamamen genel cümleler YOK
- Markdown, ** etc YOK — sadece düz metin
- "Sevgili İK", "Sayın Yetkili" gibi sade bir hitap ile başla
- Sonda imza yerine sadece ad: '{ogrenci['ad_soyad']}'{ek_yonerge}

SADECE kapak mektubunu yaz, başka metin/açıklama yok."""


# ────────────────────────────────────────────────────────────────────────────
# LLM cascade
# ────────────────────────────────────────────────────────────────────────────

async def _gemini(prompt: str) -> Optional[str]:
    if not GEMINI_KEY:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_KEY)
        r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
        return (r.text or "").strip() or None
    except Exception:
        return None


def _groq(prompt: str) -> Optional[str]:
    if not GROQ_KEY:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_KEY)
        r = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        return (r.choices[0].message.content or "").strip() or None
    except Exception:
        return None


def _openai(prompt: str) -> Optional[str]:
    if not OPENAI_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_KEY)
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        return (r.choices[0].message.content or "").strip() or None
    except Exception:
        return None


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

async def kapak_mektubu_uret(
    db: Session, user: User, internship: Internship,
    ton: str = "denge", uzunluk: str = "orta", ekstra: Optional[str] = None,
) -> dict:
    """Üretilen düz metin + kullanılan model + uyarılar."""
    ogrenci = _ogrenci_baglami(db, user)
    ilan    = _ilan_baglami(internship)
    prompt  = _prompt_olustur(ogrenci, ilan, ton, uzunluk, ekstra)

    metin = await _gemini(prompt)
    kullanilan = "gemini"
    if not metin:
        metin = _groq(prompt)
        kullanilan = "groq"
    if not metin:
        metin = _openai(prompt)
        kullanilan = "openai"

    if not metin:
        return {
            "basarili": False,
            "metin":     None,
            "kullanilan_model": None,
            "kelime_sayisi": 0,
            "hata": "Tüm LLM sağlayıcıları başarısız oldu (Gemini, Groq, OpenAI).",
            "uyarilar": [],
        }

    # Markdown temizliği — bazı modeller ** veya başlık koyabilir
    temizlenmis = metin.replace("**", "").replace("__", "").strip()
    kelime = len(temizlenmis.split())

    uyarilar = []
    if not ogrenci["projeler"]:
        uyarilar.append("Profilinde proje yok — kapak mektubu daha genel oldu. Portföye proje eklersen daha güçlü olur.")
    if not ogrenci["cv_ozet"]:
        uyarilar.append("CV özetin boş — daha kişiselleştirilmiş bir mektup için profilden özet yaz.")

    return {
        "basarili":         True,
        "metin":            temizlenmis,
        "kullanilan_model": kullanilan,
        "kelime_sayisi":    kelime,
        "hata":             None,
        "uyarilar":         uyarilar,
    }
