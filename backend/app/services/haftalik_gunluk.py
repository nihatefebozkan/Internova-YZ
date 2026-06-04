"""Haftalık öğrenme günlüğü.

Bir staj başvurusunun (kabul edilmiş) DiaryEntry'lerini ISO haftalara gruplar,
her hafta için LLM ile özet + ana konular + öğrenilen kavramlar üretir.

Çıktı şeması:
{
  "internship_id": 1, "pozisyon": "Backend Stajyer", "sirket_adi": "...",
  "haftalar": [
    {
      "yil_hafta": "2026-W22",            # ISO yıl-hafta
      "baslangic": "2026-05-25",
      "bitis":     "2026-05-31",
      "girisler": [{...DiaryEntryResponse}],
      "ana_konular": ["JWT auth", "PostgreSQL şema tasarımı", ...],
      "ozet": "Bu hafta ... yaptın",
      "ai_basarili": True,
      "ai_model": "gemini" | "groq" | "openai" | None
    },
    ...
  ]
}
"""
import os
import re
import json
from datetime import date as date_cls, datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Application, DiaryEntry, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Hafta grupleme
# ────────────────────────────────────────────────────────────────────────────

def _hafta_anahtar(d: date_cls) -> str:
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _hafta_aralik(yil: int, hafta: int) -> tuple[date_cls, date_cls]:
    """ISO yıl + hafta numarasından Pazartesi-Pazar aralığı."""
    monday = date_cls.fromisocalendar(yil, hafta, 1)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _girisi_dict_yap(g: DiaryEntry) -> dict:
    return {
        "id":               g.id,
        "tarih":            g.tarih.isoformat() if g.tarih else None,
        "ham_metin":        g.ham_metin or "",
        "akademik_metin":   g.akademik_metin or "",
        "llm_isleme_durumu": g.llm_isleme_durumu.value if hasattr(g.llm_isleme_durumu, "value") else str(g.llm_isleme_durumu),
        "onaylandi":        g.onaylandi,
    }


# ────────────────────────────────────────────────────────────────────────────
# LLM özet
# ────────────────────────────────────────────────────────────────────────────

def _prompt(hafta_girisleri: list[dict], pozisyon: str, sirket: Optional[str]) -> str:
    metinler = []
    for g in hafta_girisleri:
        ana = g["akademik_metin"] or g["ham_metin"] or ""
        if ana.strip():
            metinler.append(f"[{g['tarih']}] {ana.strip()[:400]}")
    birlestirilmis = "\n\n".join(metinler) if metinler else "(boş)"
    return f"""Bir staj danışmanı olarak öğrencinin bir haftalık staj defteri girişlerini özetle.

POZİSYON: {pozisyon}
ŞİRKET: {sirket or '—'}

HAFTANIN GİRİŞLERİ:
{birlestirilmis[:3500]}

ÇIKTI - sadece JSON, başka metin/markdown yok:

{{
  "ana_konular": ["JWT auth", "PostgreSQL şema tasarımı", ...],
  "ozet": "Bu hafta ... yaptın, ... öğrendin. 3-4 cümle, profesyonel ama samimi."
}}

KURALLAR
- ana_konular: 3-6 madde, somut teknik kavram (örn 'Docker compose', 'REST endpoint tasarımı'), GENEL DEĞİL
- ozet: 'Sen' diliyle, 40-70 kelime, motive edici ama dürüst, sadece düz metin"""


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
            temperature=0.3,
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
            temperature=0.3,
        )
        m = re.search(r"\{[\s\S]*\}", r.choices[0].message.content or "")
        if m: return json.loads(m.group(0))
    except Exception:
        return None
    return None


def _haftalik_ozet(girisler: list[dict], pozisyon: str, sirket: Optional[str], ai: bool) -> tuple[dict, str | None]:
    """Bir haftanın özetini üretir. ai=False ise atlanır."""
    if not ai or not girisler:
        return {"ana_konular": [], "ozet": None}, None
    p = _prompt(girisler, pozisyon, sirket)
    sonuc = _gemini(p)
    kullanilan = "gemini"
    if not sonuc:
        sonuc = _groq(p); kullanilan = "groq"
    if not sonuc:
        sonuc = _openai(p); kullanilan = "openai"
    if not sonuc:
        return {"ana_konular": [], "ozet": None}, None
    return {
        "ana_konular": sonuc.get("ana_konular") or [],
        "ozet":        sonuc.get("ozet"),
    }, kullanilan


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

async def haftalik_gunluk(db: Session, user: User, application: Application, ai: bool = True) -> dict:
    internship = application.internship
    girisler = (
        db.query(DiaryEntry)
        .filter(
            DiaryEntry.student_id == user.id,
            DiaryEntry.internship_id == application.internship_id,
        )
        .order_by(DiaryEntry.tarih.asc())
        .all()
    )

    # Haftalara grup
    gruplar: dict[str, list[DiaryEntry]] = {}
    for g in girisler:
        if not g.tarih:
            continue
        key = _hafta_anahtar(g.tarih)
        gruplar.setdefault(key, []).append(g)

    haftalar = []
    for key, gs in sorted(gruplar.items(), reverse=True):    # en yeni hafta üstte
        yil, hafta = int(key.split("-W")[0]), int(key.split("-W")[1])
        bas, bit = _hafta_aralik(yil, hafta)
        giris_dictleri = [_girisi_dict_yap(g) for g in gs]
        ozet_data, model = _haftalik_ozet(
            giris_dictleri,
            internship.pozisyon if internship else "Staj",
            getattr(internship.company, "ad", None) if internship and internship.company else None,
            ai,
        )
        haftalar.append({
            "yil_hafta":   key,
            "baslangic":   bas.isoformat(),
            "bitis":       bit.isoformat(),
            "giris_sayisi": len(gs),
            "girisler":    giris_dictleri,
            "ana_konular": ozet_data["ana_konular"],
            "ozet":        ozet_data["ozet"],
            "ai_basarili": ozet_data["ozet"] is not None,
            "ai_model":    model,
        })

    return {
        "application_id": application.id,
        "internship_id":  application.internship_id,
        "pozisyon":       internship.pozisyon if internship else None,
        "sirket_adi":     getattr(internship.company, "ad", None) if internship and internship.company else None,
        "toplam_giris":   len(girisler),
        "toplam_hafta":   len(haftalar),
        "haftalar":       haftalar,
    }
