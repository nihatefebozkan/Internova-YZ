"""Şirket önanalizi — eski stajyerlerin diary girişleri + anonim deneyim
paylaşımlarından, "büyük ihtimalle şunlarla çalışacaksın" tarzı bir özet üretir.

Veri akışı:
  1) Şirketin company_id'sini al
  2) Bu şirkette `tamamlandi=True` olan tüm Application'ları topla
  3) Onların student'larına ait DiaryEntry'leri topla (anonim agregat)
  4) StajDeneyim paylaşımlarını ekle (puan/tavsiye + teknolojiler + yorumlar)
  5) LLM ile sentez: muhtemel teknolojiler + yaygın konular + iş kültürü ipuçları

LLM cascade: Gemini → Groq → OpenAI. Yetersiz veri (< 2 staj geçmişi VE
< 2 deneyim paylaşımı) → yumuşak hata döner.
"""
import os
import re
import json
from typing import Optional
from collections import Counter
from sqlalchemy.orm import Session

from app.models import (
    Application, ApplicationStatus, DiaryEntry, StajDeneyim, User,
)

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Bağlam toplama
# ────────────────────────────────────────────────────────────────────────────

def _diary_metni_topla(db: Session, company_id: int, max_giris: int = 80) -> tuple[list[str], int]:
    """Bu şirkette tamamlanmış stajların diary girişlerini anonim agregat döner."""
    rows = (
        db.query(DiaryEntry)
        .join(Application, Application.student_id == DiaryEntry.student_id)
        .filter(
            Application.tamamlandi == True,
            Application.durum == ApplicationStatus.kabul.value,
            Application.internship_id == DiaryEntry.internship_id,
        )
        # Bu şirketin internships'inden gelen başvurular
        .join(Application.internship)
        .filter(Application.internship.has(company_id=company_id))
        .order_by(DiaryEntry.tarih.desc())
        .limit(max_giris)
        .all()
    )
    girisler = []
    for d in rows:
        ana = d.akademik_metin or d.ham_metin or ""
        if ana.strip():
            girisler.append(ana.strip()[:280])
    return girisler, len({d.student_id for d in rows})


def _deneyim_meta(db: Session, company_id: int) -> dict:
    """StajDeneyim paylaşımlarından agregat istatistik ve yorum havuzu."""
    deneyimler = db.query(StajDeneyim).filter(
        StajDeneyim.company_id == company_id,
        StajDeneyim.onay_durumu == "onayli",
    ).all()

    teknoloji_sayac = Counter()
    yorumlar = []
    puanlar = []
    tavsiye_say = 0
    cevaplilar = 0
    departmanlar = Counter()

    for d in deneyimler:
        for t in (d.ogrendigi_teknolojiler or []):
            if isinstance(t, str) and t.strip():
                teknoloji_sayac[t.strip()] += 1
        if d.genel_yorum:
            yorumlar.append(d.genel_yorum.strip()[:220])
        if d.puan:
            puanlar.append(d.puan)
        if d.tavsiye_eder_mi is not None:
            cevaplilar += 1
            if d.tavsiye_eder_mi:
                tavsiye_say += 1
        if d.calistigi_departman:
            departmanlar[d.calistigi_departman.strip()] += 1

    return {
        "toplam_paylasim": len(deneyimler),
        "ortalama_puan": round(sum(puanlar) / len(puanlar), 1) if puanlar else None,
        "tavsiye_yuzdesi": round(tavsiye_say / cevaplilar * 100) if cevaplilar else None,
        "en_cok_teknoloji": [t for t, _ in teknoloji_sayac.most_common(8)],
        "departmanlar": [d for d, _ in departmanlar.most_common(5)],
        "yorumlar": yorumlar,
    }


# ────────────────────────────────────────────────────────────────────────────
# LLM
# ────────────────────────────────────────────────────────────────────────────

def _prompt(sirket_adi: str, diary: list[str], deneyim_meta: dict, ogrenci_sayisi: int) -> str:
    diary_text = "\n".join(f"- {d}" for d in diary[:30]) or "(yok)"
    yorumlar = "\n".join(f"- {y}" for y in deneyim_meta["yorumlar"][:8]) or "(yok)"
    teks = ", ".join(deneyim_meta["en_cok_teknoloji"]) or "—"
    deps = ", ".join(deneyim_meta["departmanlar"]) or "—"
    return f"""Bir staj danışmanı olarak {sirket_adi} şirketinde staj yapacak bir öğrenci
için ÖNANALİZ üret. Sadece JSON döndür, başka metin/markdown yok.

KAYNAK 1 — Önceki {ogrenci_sayisi} stajyerin diary girişleri (anonim):
{diary_text[:2800]}

KAYNAK 2 — Anonim deneyim paylaşımları:
- Ortalama puan: {deneyim_meta['ortalama_puan'] or '—'} / 5
- Tavsiye oranı: %{deneyim_meta['tavsiye_yuzdesi'] or '—'}
- En çok geçen teknolojiler: {teks}
- Sık çalışılan departmanlar: {deps}
- Genel yorumlar:
{yorumlar[:1500]}

ÇIKTI:

{{
  "muhtemel_teknolojiler": ["FastAPI", "Docker", "PostgreSQL", ...],
  "yaygin_isler": ["REST API tasarımı", "code review katılımı", ...],
  "is_kulturu_ipuclari": ["Mentor desteği güçlü", "Sprint planlaması yapılır", ...],
  "uyari_noktalari": ["Bazı stajyer mentor desteğinin az olduğunu belirtmiş", ...],
  "ozet": "2-3 cümle, samimi ama profesyonel"
}}

KURALLAR
- Sadece kaynak verilere dayan, hayal etme
- "Genel olarak", "programlama bilgisi" gibi muğlak ifadeler YOK
- Spesifik teknoloji/araç adlarını kullan
- 'uyari_noktalari' opsiyoneldir; veri varsa ekle yoksa boş liste
- Türkçe, sade dil
- ozet 60-100 kelime
"""


async def _gemini(prompt: str) -> Optional[dict]:
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


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

MIN_VERI_OGRENCI = 1   # En az 1 tamamlanmış staj
MIN_VERI_DENEYIM = 0   # veya deneyim paylaşımı yoksa diary yeter


async def sirket_onanalizi(db: Session, company: User) -> dict:
    """Bir şirket için önanaliz üretir."""
    diary, ogrenci_sayisi = _diary_metni_topla(db, company.id)
    meta = _deneyim_meta(db, company.id)

    yetersiz_veri = (
        ogrenci_sayisi < MIN_VERI_OGRENCI and
        meta["toplam_paylasim"] < 2
    )
    if yetersiz_veri:
        return {
            "basarili": False,
            "company_id": company.id,
            "sirket_adi": company.ad,
            "ogrenci_sayisi": ogrenci_sayisi,
            "deneyim_sayisi": meta["toplam_paylasim"],
            "ortalama_puan": meta["ortalama_puan"],
            "tavsiye_yuzdesi": meta["tavsiye_yuzdesi"],
            "muhtemel_teknolojiler": [],
            "yaygin_isler": [],
            "is_kulturu_ipuclari": [],
            "uyari_noktalari": [],
            "ozet": None,
            "kullanilan_model": None,
            "hata": (
                "Bu şirket için yeterli geçmiş staj verisi yok. "
                "En az 1 tamamlanmış staj veya 2 anonim deneyim paylaşımı gerekli."
            ),
        }

    p = _prompt(company.ad, diary, meta, ogrenci_sayisi)
    sonuc = await _gemini(p)
    kullanilan = "gemini"
    if not sonuc:
        sonuc = _groq(p); kullanilan = "groq"
    if not sonuc:
        sonuc = _openai(p); kullanilan = "openai"

    if not sonuc:
        return {
            "basarili": False,
            "company_id": company.id,
            "sirket_adi": company.ad,
            "ogrenci_sayisi": ogrenci_sayisi,
            "deneyim_sayisi": meta["toplam_paylasim"],
            "ortalama_puan": meta["ortalama_puan"],
            "tavsiye_yuzdesi": meta["tavsiye_yuzdesi"],
            "muhtemel_teknolojiler": meta["en_cok_teknoloji"],
            "yaygin_isler": [], "is_kulturu_ipuclari": [], "uyari_noktalari": [],
            "ozet": None, "kullanilan_model": None,
            "hata": "LLM sağlayıcıları başarısız oldu",
        }

    # LLM çıktısı + meta birleştir
    return {
        "basarili": True,
        "company_id": company.id,
        "sirket_adi": company.ad,
        "ogrenci_sayisi": ogrenci_sayisi,
        "deneyim_sayisi": meta["toplam_paylasim"],
        "ortalama_puan": meta["ortalama_puan"],
        "tavsiye_yuzdesi": meta["tavsiye_yuzdesi"],
        "muhtemel_teknolojiler": sonuc.get("muhtemel_teknolojiler") or meta["en_cok_teknoloji"],
        "yaygin_isler":         sonuc.get("yaygin_isler") or [],
        "is_kulturu_ipuclari":  sonuc.get("is_kulturu_ipuclari") or [],
        "uyari_noktalari":      sonuc.get("uyari_noktalari") or [],
        "ozet":                 sonuc.get("ozet"),
        "kullanilan_model":     kullanilan,
        "hata":                 None,
    }
