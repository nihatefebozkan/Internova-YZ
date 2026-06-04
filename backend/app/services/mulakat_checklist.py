"""Mülakat hazırlık checklist üretici.

Bir başvuru `mulakat` durumuna geçtiğinde öğrenci için şirket + pozisyon + öz
profile özel kategorize edilmiş checklist üretir.

Çıktı:
{
  "basarili": true,
  "pozisyon": "Backend Stajyer",
  "sirket_adi": "Teknoloji A.Ş.",
  "kategoriler": [
    {
      "ad": "Teknik Hazırlık",
      "ikon": "💻",
      "maddeler": [
        {"baslik": "FastAPI ile basit bir CRUD app yaz ve canlıda anlat", "neden": "İlanda Python/FastAPI gereksinimi"}
      ]
    },
    ...
  ],
  "genel_tavsiye": "kısa bir kapanış paragrafı"
}
"""
import os
import re
import json
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Application, CV, Internship, Portfolio, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Bağlam toplama
# ────────────────────────────────────────────────────────────────────────────

def _baglam(db: Session, user: User, internship: Internship) -> dict:
    cv = db.query(CV).filter(CV.student_id == user.id).first()
    projeler = db.query(Portfolio).filter(Portfolio.student_id == user.id).all()
    en_iyi = sorted(projeler, key=lambda p: p.teknik_yetkinlik or 0, reverse=True)[:3]
    proje_meta = [
        {
            "ad": p.proje_adi,
            "teknolojiler": (p.teknolojiler or [])[:5],
            "konu": p.konu,
        }
        for p in en_iyi
    ]
    return {
        "ogrenci_ad": f"{user.ad} {user.soyad}".strip(),
        "bolum":      user.bolum or "—",
        "beceriler":  (cv.beceriler or [])[:15] if cv else [],
        "projeler":   proje_meta,
        "pozisyon":   internship.pozisyon,
        "departman":  internship.departman,
        "sirket_adi": getattr(internship.company, "ad", None) if internship.company else None,
        "aciklama":   (internship.aciklama or "").strip()[:400],
        "gereksinimler": (internship.gereksinimler or "").strip()[:400],
        "beceri_profili": internship.beceri_profili or {},
    }


def _prompt(baglam: dict) -> str:
    proje_text = "\n".join(
        f"- {p['ad']}: {p['konu']}, teknolojiler: {', '.join(p['teknolojiler']) or '—'}"
        for p in baglam["projeler"]
    ) or "(proje yok)"

    bp = ", ".join(f"{k}={v}" for k, v in baglam["beceri_profili"].items()) or "—"

    return f"""Bir staj danışmanı olarak öğrenci için MÜLAKATA HAZIRLIK checklist'i üret.

ÖĞRENCİ
- Ad: {baglam['ogrenci_ad']}
- Bölüm: {baglam['bolum']}
- Beceriler: {', '.join(baglam['beceriler']) or '—'}
- En değerli projeler:
{proje_text}

POZİSYON
- Şirket: {baglam['sirket_adi'] or '—'}
- Pozisyon: {baglam['pozisyon']}
- Departman: {baglam['departman'] or '—'}
- Açıklama: {baglam['aciklama'] or '—'}
- Gereksinimler: {baglam['gereksinimler'] or '—'}
- Aranan beceri kategorileri: {bp}

GÖREV
Aşağıdaki kategorilerde her birine 3-5 SOMUT, KİŞİSELLEŞTİRİLMİŞ madde üret.
- "Teknik Hazırlık": ilanın teknolojilerine + öğrencinin projelerine atıfla pratik egzersizler
- "Şirket Araştırması": somut bilgi noktaları (ürün, takım, kültür, son haberler — varsa şirket adını kullan)
- "Olası Sorular ve Cevaplar": öğrencinin profili+ilan kesişiminden çıkan TAMAMEN SPESİFİK sorular
- "Pratik Lojistik": kıyafet, vakit yönetimi, ortam, ön/sonrası

ÇIKTI FORMATI — sadece JSON, başka metin yok, markdown YOK:

{{
  "kategoriler": [
    {{
      "ad": "Teknik Hazırlık",
      "ikon": "💻",
      "maddeler": [
        {{"baslik": "kısa eylem cümlesi", "neden": "neden bu önemli (1 cümle)"}}
      ]
    }},
    {{"ad": "Şirket Araştırması", "ikon": "🏢", "maddeler": [...]}},
    {{"ad": "Olası Sorular ve Cevaplar", "ikon": "❓", "maddeler": [...]}},
    {{"ad": "Pratik Lojistik", "ikon": "📋", "maddeler": [...]}}
  ],
  "genel_tavsiye": "2-3 cümle samimi kapanış"
}}

KURALLAR
- Sadece geçerli JSON döndür
- "Genel programlama bilgisi tazele" gibi MUĞLAK ifadeler YOK — illa spesifik (örn: "list comprehension ve dictionary unpacking örnekleri pratik et")
- Öğrencinin GERÇEK projelerine atıfla "Internova-YZ projendeki JWT auth'u anlatmak için 90 sn lik pitch hazırla" gibi
- Şirket adı varsa adıyla seslen, "şirketin" deme
- Toplam 12-16 madde, kategori başına 3-4 ideal"""


# ────────────────────────────────────────────────────────────────────────────
# LLM cascade
# ────────────────────────────────────────────────────────────────────────────

async def _gemini(prompt: str) -> Optional[dict]:
    if not GEMINI_KEY:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_KEY)
        r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
        m = re.search(r"\{[\s\S]*\}", r.text or "")
        if m:
            return json.loads(m.group(0))
    except Exception:
        return None
    return None


def _groq(prompt: str) -> Optional[dict]:
    if not GROQ_KEY:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_KEY)
        r = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        m = re.search(r"\{[\s\S]*\}", r.choices[0].message.content or "")
        if m:
            return json.loads(m.group(0))
    except Exception:
        return None
    return None


def _openai(prompt: str) -> Optional[dict]:
    if not OPENAI_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_KEY)
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        m = re.search(r"\{[\s\S]*\}", r.choices[0].message.content or "")
        if m:
            return json.loads(m.group(0))
    except Exception:
        return None
    return None


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

async def mulakat_hazirligi_uret(db: Session, user: User, application: Application) -> dict:
    """LLM ile şirkete + pozisyona + öz profile özel kategorize checklist üretir."""
    internship = application.internship
    if not internship:
        return {
            "basarili": False,
            "pozisyon": None, "sirket_adi": None,
            "kategoriler": [], "genel_tavsiye": None,
            "kullanilan_model": None,
            "hata": "Başvuruya bağlı ilan bulunamadı",
        }

    baglam = _baglam(db, user, internship)
    p = _prompt(baglam)

    sonuc = await _gemini(p)
    kullanilan = "gemini"
    if not sonuc:
        sonuc = _groq(p); kullanilan = "groq"
    if not sonuc:
        sonuc = _openai(p); kullanilan = "openai"

    if not sonuc:
        return {
            "basarili": False,
            "pozisyon": internship.pozisyon,
            "sirket_adi": baglam["sirket_adi"],
            "kategoriler": [],
            "genel_tavsiye": None,
            "kullanilan_model": None,
            "hata": "Tüm LLM sağlayıcıları başarısız oldu",
        }

    return {
        "basarili": True,
        "pozisyon": internship.pozisyon,
        "sirket_adi": baglam["sirket_adi"],
        "kategoriler": sonuc.get("kategoriler") or [],
        "genel_tavsiye": sonuc.get("genel_tavsiye"),
        "kullanilan_model": kullanilan,
        "hata": None,
    }
