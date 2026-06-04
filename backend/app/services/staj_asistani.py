"""Staj asistanı — aktif başvuru bağlamında LLM ile soru-cevap.

İki mod:
  1) Genel mod (application_id YOK): mevcut RAG (BTÜ yönetmeliği) gibi davranır.
  2) Staj modu (application_id VAR): kullanıcının başvurusunun
     - durum (bekleyen/inceleniyor/mulakat/kabul)
     - pozisyon + şirket
     - aşamaya özgü ipucu
     - kabul ise son diary girişleri
     bağlamıyla cevap verir.

LLM cascade: Gemini → Groq → OpenAI.
"""
import os
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Application, DiaryEntry, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Bağlam üretimi
# ────────────────────────────────────────────────────────────────────────────

DURUM_ASAMA_IPUCU = {
    "bekleyen":    "Henüz şirket başvuruyu açmadı; öğrenci hazırlık aşamasında.",
    "inceleniyor": "Şirket başvuruyu inceliyor; öğrenci bekleme aşamasında, profilini güçlendirebilir.",
    "mulakat":     "Şirket mülakata çağırdı; öğrenci hazırlık checklist'i çalışmalı.",
    "kabul":       "Staj devam ediyor; öğrenci günlük girişleri, öğrenmeleri ve şirkete uyum hakkında yönlendirme arıyor.",
    "red":         "Staj reddedildi; öğrenci farklı pozisyonlara yönelmeli, geri bildirim almaya çalışmalı.",
}


def _diary_son_n(db: Session, user_id: int, internship_id: int, n: int = 3) -> list[str]:
    girisler = (
        db.query(DiaryEntry)
        .filter(DiaryEntry.student_id == user_id, DiaryEntry.internship_id == internship_id)
        .order_by(DiaryEntry.tarih.desc())
        .limit(n)
        .all()
    )
    out = []
    for g in girisler:
        ana = g.akademik_metin or g.ham_metin or ""
        if ana.strip():
            out.append(f"[{g.tarih}] {ana.strip()[:250]}")
    return out


def _baglam_metni(db: Session, user: User, application: Application) -> str:
    internship = application.internship
    sirket = getattr(internship.company, "ad", None) if internship and internship.company else None
    pozisyon = internship.pozisyon if internship else "Staj"
    durum = application.durum
    asama = DURUM_ASAMA_IPUCU.get(durum, "")

    parcalar = [
        f"Öğrenci: {user.ad} {user.soyad} ({user.bolum or 'bölüm belirtilmemiş'})",
        f"Pozisyon: {pozisyon}",
        f"Şirket: {sirket or '—'}",
        f"Başvuru durumu: {durum} — {asama}",
    ]

    if durum == "kabul":
        son_girisler = _diary_son_n(db, user.id, application.internship_id, n=3)
        if son_girisler:
            parcalar.append("Son günlük girişleri:\n" + "\n".join(son_girisler))

    return "\n".join(parcalar)


# ────────────────────────────────────────────────────────────────────────────
# LLM cascade
# ────────────────────────────────────────────────────────────────────────────

def _prompt(baglam: str, soru: str) -> str:
    return f"""Sen bir staj danışmanı asistanısın. Aşağıdaki bağlamı bilen bir
mentor gibi cevap ver — bağlamı tekrarlama, sadece sorunun cevabına odaklan.

BAĞLAM:
{baglam}

SORU: {soru}

KURALLAR:
- Türkçe yanıt
- 80-180 kelime arası, somut, eyleme dönük
- Bağlamdaki şirket/pozisyon adını uygun yerlerde kullan
- Klişe veya çok genel yanıttan kaçın
- Madde işaretleri (•) kullanabilirsin ama markdown başlık/bold YOK
- Sonda gereksiz kapanış cümlesi yok"""


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
            temperature=0.4,
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
            temperature=0.4,
        )
        return (r.choices[0].message.content or "").strip() or None
    except Exception:
        return None


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

async def asistana_sor(db: Session, user: User, soru: str, application: Application) -> dict:
    """application = aktif başvuru. Bağlamla LLM'e gönderir."""
    baglam = _baglam_metni(db, user, application)
    p = _prompt(baglam, soru)

    metin = await _gemini(p)
    kullanilan = "gemini"
    if not metin:
        metin = _groq(p); kullanilan = "groq"
    if not metin:
        metin = _openai(p); kullanilan = "openai"

    if not metin:
        return {
            "basarili": False,
            "yanit": None,
            "kullanilan_model": None,
            "asama": application.durum,
            "hata": "Tüm LLM sağlayıcıları başarısız oldu",
        }

    # Markdown temizliği
    metin = metin.replace("**", "").replace("__", "").strip()
    return {
        "basarili": True,
        "yanit": metin,
        "kullanilan_model": kullanilan,
        "asama": application.durum,
        "hata": None,
    }
