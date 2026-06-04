"""Staj diary girişlerinden otomatik beceri çıkarıcı.

Mantık:
  1) Bir stajın tüm DiaryEntry'lerini topla
  2) LLM'e ver: "bu girişlerde GERÇEKTEN kullanılan/öğrenilen teknik becerileri çıkar"
  3) Her beceri için kaynak gösterimi (hangi giriş tarihinde geçti)
  4) Mevcut CV.beceriler'le karşılaştır: zaten varsa "mevcut" işaretle
  5) Kullanıcı onayladıktan sonra ayrı bir endpoint ile CV'ye merge edilir

Çıktı:
{
  "basarili": True,
  "kullanilan_model": "gemini",
  "toplam_giris": 6,
  "onerilen_beceriler": [
    {
      "ad": "FastAPI",
      "guven": 0.95,                    # 0-1, LLM'in ne kadar emin
      "kategori": "framework",
      "kaynak_tarihler": ["2026-05-18","2026-05-19"],
      "zaten_var": False
    },
    ...
  ],
  "hata": None
}

Onay endpoint'i sadece adları alır ve CV.beceriler'e merge eder (duplikatsız).
"""
import os
import re
import json
from typing import Optional
from datetime import date as date_cls
from sqlalchemy.orm import Session

from app.models import CV, DiaryEntry, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Mevcut beceri seti
# ────────────────────────────────────────────────────────────────────────────

def _normalize(s: str) -> str:
    return (s or "").strip().lower()


def _mevcut_beceriler(cv: Optional[CV]) -> set[str]:
    """CV.beceriler listesini normalize edip set döner."""
    if not cv or not cv.beceriler:
        return set()
    out = set()
    for b in cv.beceriler:
        if isinstance(b, str):
            out.add(_normalize(b))
        elif isinstance(b, dict):
            ad = b.get("name") or b.get("ad")
            if ad:
                out.add(_normalize(ad))
    return out


# ────────────────────────────────────────────────────────────────────────────
# LLM cascade
# ────────────────────────────────────────────────────────────────────────────

def _prompt(girisler: list[dict], pozisyon: str) -> str:
    metinler = []
    for g in girisler:
        ana = g["akademik_metin"] or g["ham_metin"]
        if ana.strip():
            metinler.append(f"[{g['tarih']}] {ana.strip()[:300]}")
    bg = "\n".join(metinler) if metinler else "(boş)"
    return f"""Bir staj danışmanı olarak öğrencinin staj defteri girişlerinden GERÇEKTEN
kullanılan/öğrenilen teknik becerileri çıkar.

POZİSYON: {pozisyon}

GİRİŞLER:
{bg[:3500]}

KURALLAR
- SADECE somut teknoloji / araç / kavram (örn: "FastAPI", "Docker", "JWT auth", "PostgreSQL şema tasarımı")
- "Programlama", "iş birliği" gibi MUĞLAK ifadeler YOK
- Diary'lerde GERÇEKTEN geçenler, hayal değil
- Her beceri için 0-1 arası güven puanı (girişlerde ne kadar açık geçtiği)
- guven >= 0.5 olanlardan 5-12 madde çıkar
- kaynak_tarihler: girişlerde geçtiği tarihler listesi (YYYY-MM-DD)

ÇIKTI - sadece JSON, başka metin/markdown yok:

{{
  "beceriler": [
    {{
      "ad": "FastAPI",
      "guven": 0.95,
      "kategori": "framework",
      "kaynak_tarihler": ["2026-05-18"]
    }},
    ...
  ]
}}

kategori: "dil" | "framework" | "veritabanı" | "araç" | "kavram" | "bulut" | "diğer"
"""


def _gemini(prompt: str) -> Optional[dict]:
    if not GEMINI_KEY:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_KEY)
        r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
        m = re.search(r"\{[\s\S]*\}", r.text or "")
        if m: return json.loads(m.group(0))
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
            temperature=0.2,
        )
        m = re.search(r"\{[\s\S]*\}", r.choices[0].message.content or "")
        if m: return json.loads(m.group(0))
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
            temperature=0.2,
        )
        m = re.search(r"\{[\s\S]*\}", r.choices[0].message.content or "")
        if m: return json.loads(m.group(0))
    except Exception:
        return None
    return None


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyonlar
# ────────────────────────────────────────────────────────────────────────────

async def becerileri_cikar(db: Session, user: User, internship_id: int) -> dict:
    """Bir stajın diary'lerinden beceri önerileri çıkarır."""
    girisler_obj = (
        db.query(DiaryEntry)
        .filter(DiaryEntry.student_id == user.id, DiaryEntry.internship_id == internship_id)
        .order_by(DiaryEntry.tarih.asc())
        .all()
    )

    if not girisler_obj:
        return {
            "basarili": False, "kullanilan_model": None,
            "toplam_giris": 0, "onerilen_beceriler": [],
            "hata": "Bu staj için günlük girişi yok",
        }

    girisler = [
        {
            "tarih": g.tarih.isoformat() if g.tarih else None,
            "ham_metin": g.ham_metin or "",
            "akademik_metin": g.akademik_metin or "",
        }
        for g in girisler_obj
    ]
    pozisyon = girisler_obj[0].internship.pozisyon if girisler_obj[0].internship else "Staj"

    p = _prompt(girisler, pozisyon)
    sonuc = _gemini(p)
    kullanilan = "gemini"
    if not sonuc:
        sonuc = _groq(p); kullanilan = "groq"
    if not sonuc:
        sonuc = _openai(p); kullanilan = "openai"

    if not sonuc:
        return {
            "basarili": False, "kullanilan_model": None,
            "toplam_giris": len(girisler), "onerilen_beceriler": [],
            "hata": "Tüm LLM sağlayıcıları başarısız oldu",
        }

    cv = db.query(CV).filter(CV.student_id == user.id).first()
    mevcut = _mevcut_beceriler(cv)

    onerilen = []
    for b in sonuc.get("beceriler", []):
        if not isinstance(b, dict):
            continue
        ad = (b.get("ad") or "").strip()
        if not ad:
            continue
        try:
            guven = float(b.get("guven", 0))
        except (TypeError, ValueError):
            guven = 0.5
        if guven < 0.5:
            continue
        kaynak = b.get("kaynak_tarihler") or []
        if not isinstance(kaynak, list):
            kaynak = []
        onerilen.append({
            "ad": ad,
            "guven": round(max(0.0, min(1.0, guven)), 2),
            "kategori": b.get("kategori") or "diğer",
            "kaynak_tarihler": [str(t) for t in kaynak[:5]],
            "zaten_var": _normalize(ad) in mevcut,
        })

    # Güven sırasına göre
    onerilen.sort(key=lambda x: x["guven"], reverse=True)

    return {
        "basarili": True, "kullanilan_model": kullanilan,
        "toplam_giris": len(girisler), "onerilen_beceriler": onerilen,
        "hata": None,
    }


def becerileri_ekle(db: Session, user: User, secilen_beceriler: list[str]) -> dict:
    """Seçilen becerileri CV.beceriler'e merge eder (case-insensitive duplikat eler)."""
    cv = db.query(CV).filter(CV.student_id == user.id).first()
    if not cv:
        # Boş CV oluştur
        cv = CV(student_id=user.id, beceriler=[])
        db.add(cv)
        db.flush()

    mevcut_list = list(cv.beceriler or [])
    mevcut_normalize = _mevcut_beceriler(cv)

    eklenenler = []
    atlananlar = []
    for ad in secilen_beceriler:
        ad_clean = (ad or "").strip()
        if not ad_clean:
            continue
        if _normalize(ad_clean) in mevcut_normalize:
            atlananlar.append(ad_clean)
            continue
        mevcut_list.append(ad_clean)
        mevcut_normalize.add(_normalize(ad_clean))
        eklenenler.append(ad_clean)

    cv.beceriler = mevcut_list
    db.commit()
    db.refresh(cv)

    return {
        "eklenenler": eklenenler,
        "atlananlar": atlananlar,
        "toplam_beceri_sayisi": len(mevcut_list),
    }
