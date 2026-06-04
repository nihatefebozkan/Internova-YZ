"""Kişisel eksik analizi — bir staj ilanına karşı öğrencinin gap analizi.

Mantık:
  1. İlanın `beceri_profili` JSONB'sini oku ({kategori: hedef_0_100}).
  2. Kullanıcının CV.beceriler listesinden her ilan kategorisinde radar skoru üret
     (career.py'daki _hesapla_radar mantığı + portfolio teknoloji desteği).
  3. Her kategoride gap = max(0, hedef - mevcut) hesapla.
  4. En büyük 3 boşluğa odaklı somut adımlar üret (LLM destekli).
  5. Toplam tamamlanma yüzdesi + AI yorum.

Çıktı dict; HTTP layer şemaya validate eder.
"""
import os
import json
import re
from typing import Optional
from sqlalchemy.orm import Session

from app.models import CV, Internship, Portfolio, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Radar hesaplama — kullanıcı becerilerinden ilan kategorilerine eşleme
# ────────────────────────────────────────────────────────────────────────────

def _kullanici_beceri_havuzu(db: Session, user_id: int) -> list[str]:
    """CV.beceriler + Portfolio.teknolojiler + Portfolio.kavramlar birleşimi."""
    havuz = set()
    cv = db.query(CV).filter(CV.student_id == user_id).first()
    if cv and cv.beceriler:
        for b in cv.beceriler:
            if isinstance(b, str):
                havuz.add(b.lower())
            elif isinstance(b, dict):
                ad = b.get("name") or b.get("ad")
                if ad:
                    havuz.add(str(ad).lower())
    projeler = db.query(Portfolio).filter(Portfolio.student_id == user_id).all()
    for p in projeler:
        for t in (p.teknolojiler or []):
            havuz.add(str(t).lower())
        for k in (p.kavramlar or []):
            havuz.add(str(k).lower())
    return list(havuz)


def _kategori_skor(havuz: list[str], kategori: str) -> int:
    """Bir kategoriye eşleşen beceri sayısını 0-100'e normalize et."""
    if not havuz:
        return 0
    # Kategorideki anlamlı kelimeler
    kelimeler = [w.lower() for w in re.split(r"[\s&/+-]+", kategori) if len(w) > 2]
    if not kelimeler:
        return 0
    eslesme = sum(1 for b in havuz if any(w in b for w in kelimeler))
    # 3 eşleşme tam puan kabul
    return min(round(eslesme / 3 * 100), 100)


def _seviye(fark: int) -> str:
    if fark <= 10:
        return "tam"        # eksiklik çok az / hiç yok
    if fark <= 30:
        return "kismi"      # orta düzey gap
    return "eksik"          # ciddi gap


def _kural_bazli_adim(kategori: str, fark: int) -> dict:
    """LLM gelemezse fallback olarak kuralla somut adım üret."""
    kat_low = kategori.lower()
    if "yaz" in kat_low and "dil" in kat_low:
        adim, sure = "Bir backend dilinde küçük bir API projesi yap (Python/Java/Go)", "2 hafta"
    elif "web" in kat_low:
        adim, sure = "React veya Vue ile bir SPA çıkar, REST API'ye bağla", "3 hafta"
    elif "veri" in kat_low and "yz" not in kat_low:
        adim, sure = "PostgreSQL veya MongoDB ile şema tasarımı yap, CRUD uygula", "2 hafta"
    elif "devops" in kat_low or "araç" in kat_low:
        adim, sure = "Bir projeni Docker'a alıp GitHub Actions ile CI kur", "1 hafta"
    elif "veri" in kat_low and "yz" in kat_low:
        adim, sure = "Bir veri seti üstünde basit bir ML modeli eğit (scikit-learn)", "3 hafta"
    elif "göm" in kat_low or "donanım" in kat_low:
        adim, sure = "Arduino veya Raspberry Pi ile bir gömülü sistem prototipi", "3 hafta"
    elif "yabancı" in kat_low or "dil" in kat_low:
        adim, sure = "Teknik İngilizce okuma + bir online sertifika programı", "1 ay"
    elif "yönetim" in kat_low or "iletişim" in kat_low:
        adim, sure = "Bir grup projesinde lider rol al, sprint planlaması dene", "1 ay"
    else:
        adim, sure = f"{kategori} alanında küçük bir proje veya kurs", "2-4 hafta"
    return {"gap_kategori": kategori, "adim": adim, "tahmini_sure": sure, "puan_kazanci": fark}


# ────────────────────────────────────────────────────────────────────────────
# LLM yardımcı — somut adımları kişiselleştirir
# ────────────────────────────────────────────────────────────────────────────

def _llm_adimlar(user: User, internship: Internship, top_gaplar: list[dict], havuz: list[str]) -> Optional[list[dict]]:
    """En büyük gaplar için somut, kişiye özel adımlar üretir."""
    if not (GEMINI_KEY or GROQ_KEY) or not top_gaplar:
        return None
    gap_text = "\n".join(f"- {g['kategori']}: mevcut {g['mevcut']}/100, hedef {g['hedef']}/100, fark {g['fark']}" for g in top_gaplar)
    prompt = f"""Bir staj danışmanısın. Aşağıdaki öğrencinin belirtilen staj ilanına başvurmasını
hedeflediği biliniyor. En büyük 3 beceri gap'i için, ilanla doğrudan ilişkili,
HEMEN uygulanabilir somut adım öner.

Öğrenci: {user.ad}
İlan: {internship.pozisyon} — {internship.departman or ''}
Halihazırda bildikleri (örnek): {sorted(havuz)[:20]}

Gap listesi:
{gap_text}

Yanıtı SADECE şu JSON dizisi olarak ver, başka metin/markdown yok:
[
  {{
    "gap_kategori": "...",
    "adim": "yapılacak somut iş, 1 cümle Türkçe",
    "tahmini_sure": "örn 2 hafta",
    "puan_kazanci": 15
  }},
  ...
]

Her gap için bir öğe. Adımlar GENEL DEĞİL spesifik olsun (örn 'Docker öğren' yerine 'Mevcut projenizden birini Dockerfile ile container'a alın')."""
    if GEMINI_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_KEY)
            r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
            metin = (r.text or "").strip()
            m = re.search(r"\[[\s\S]*\]", metin)
            if m:
                return json.loads(m.group(0))
        except Exception:
            pass
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            metin = (r.choices[0].message.content or "").strip()
            m = re.search(r"\[[\s\S]*\]", metin)
            if m:
                return json.loads(m.group(0))
        except Exception:
            pass
    return None


def _llm_yorum(user: User, internship: Internship, tamamlanma: int, en_zayif: list[str]) -> Optional[str]:
    """Kısa motivasyon + özet paragraf."""
    if not (GEMINI_KEY or GROQ_KEY):
        return None
    prompt = f"""İki cümlelik kısa, motive edici bir paragraf yaz.
Öğrenci: {user.ad}
İlan: {internship.pozisyon}
Tamamlanma yüzdesi: %{tamamlanma}
En zayıf 3 alan: {en_zayif}

Sen diliyle, profesyonel ama sıcak. Kelime ekonomisi: 30-50 kelime, JSON değil düz metin."""
    if GEMINI_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_KEY)
            r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
            return (r.text or "").strip() or None
        except Exception:
            pass
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
            )
            return (r.choices[0].message.content or "").strip() or None
        except Exception:
            pass
    return None


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

def eksik_analizi(db: Session, user: User, internship: Internship, ai: bool = True) -> dict:
    """Bir staj ilanı için kişisel gap analizi + somut adımlar."""
    hedef_profil = internship.beceri_profili or {}
    if not isinstance(hedef_profil, dict) or not hedef_profil:
        return {
            "internship_id": internship.id,
            "pozisyon": internship.pozisyon,
            "sirket_adi": getattr(internship.company, "ad", None) if internship.company else None,
            "tamamlanma_yuzdesi": 0,
            "gap_analizi": [],
            "en_buyuk_gaplar": [],
            "somut_adimlar": [],
            "ai_yorum": None,
            "uyari": "Bu ilanın beceri profili tanımlı değil. Şirket profili güncelleyene kadar analiz yapılamaz.",
        }

    havuz = _kullanici_beceri_havuzu(db, user.id)

    gaplar = []
    for kategori, hedef in hedef_profil.items():
        try:
            hedef = int(hedef)
        except (TypeError, ValueError):
            continue
        if hedef <= 0:
            continue
        mevcut = _kategori_skor(havuz, kategori)
        fark = max(0, hedef - mevcut)
        gaplar.append({
            "kategori": kategori,
            "hedef": hedef,
            "mevcut": mevcut,
            "fark": fark,
            "seviye": _seviye(fark),
        })

    # Tamamlanma — ağırlık olarak hedef değerleri kullan
    toplam_hedef = sum(g["hedef"] for g in gaplar) or 1
    toplam_mevcut = sum(min(g["mevcut"], g["hedef"]) for g in gaplar)
    tamamlanma = round(toplam_mevcut / toplam_hedef * 100)

    # En büyük 3 gap
    en_buyuk = sorted([g for g in gaplar if g["fark"] > 0], key=lambda g: g["fark"], reverse=True)[:3]
    en_buyuk_adlar = [g["kategori"] for g in en_buyuk]

    # Somut adımlar — LLM dene, başaramazsa kural bazlı fallback
    adimlar = None
    if ai and en_buyuk:
        adimlar = _llm_adimlar(user, internship, en_buyuk, havuz)
    if not adimlar:
        adimlar = [_kural_bazli_adim(g["kategori"], g["fark"]) for g in en_buyuk]

    yorum = _llm_yorum(user, internship, tamamlanma, en_buyuk_adlar) if ai else None

    return {
        "internship_id": internship.id,
        "pozisyon": internship.pozisyon,
        "sirket_adi": getattr(internship.company, "ad", None) if internship.company else None,
        "tamamlanma_yuzdesi": tamamlanma,
        "gap_analizi": sorted(gaplar, key=lambda g: g["hedef"], reverse=True),
        "en_buyuk_gaplar": en_buyuk_adlar,
        "somut_adimlar": adimlar,
        "ai_yorum": yorum,
        "uyari": None,
    }
