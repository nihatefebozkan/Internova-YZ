"""Sektör & alan keşfi — öğrencinin projelerinden gelen `beceri_kategorileri`
profilini sabit sektör ağırlıklarıyla karşılaştırır, uyum skorlu öneri listesi
üretir. İsteğe bağlı LLM yorumu eklenir.

Çıktı:
{
  "yeterli_veri": True,
  "mesaj": "Profil analizine göre senin için en uygun 3 sektör belirlendi.",
  "kullanici_profili": {"frontend": 60, "backend": 80, ...},   # 6 kategori
  "en_guclu_alan": "backend",
  "en_zayif_alan": "testing",
  "sektor_onerileri": [
    {
      "kod": "backend",
      "ad": "Backend Geliştirme",
      "ikon": "⚙️",
      "uyum": 78,
      "aciklama": "Sunucu tarafı uygulamalar, API tasarımı, veritabanı...",
      "neden": "Backend ve database kategorilerindeki yüksek skorların ...",
      "sonraki_adimlar": ["DevOps becerilerini geliştir", "..."]
    }
  ],
  "ai_yorum": "..."   # LLM tarafından üretilen kısa, kişiye özel paragraf
}
"""
import os
import re
import json
import asyncio
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Portfolio, User

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()


# ────────────────────────────────────────────────────────────────────────────
# Sektör tanımları (sabit) — ağırlıklar 6 kategori üzerinden 1.0'a normalize
# ────────────────────────────────────────────────────────────────────────────

SEKTORLER = {
    "web_dev": {
        "ad": "Web Geliştirme (Full-Stack)",
        "ikon": "🌐",
        "aciklama": "Hem ön yüz hem arka yüz geliştirme; modern web uygulamaları.",
        "agirliklar": {"frontend": 0.30, "backend": 0.30, "database": 0.15, "devops": 0.15, "testing": 0.05, "documentation": 0.05},
        "kavram_anahtarlari": ["rest", "react", "nodejs", "fastapi", "django", "spa", "ssr"],
    },
    "frontend": {
        "ad": "Frontend Geliştirme",
        "ikon": "🎨",
        "aciklama": "Kullanıcı arayüzü, deneyim, modern JS framework'ler.",
        "agirliklar": {"frontend": 0.65, "backend": 0.10, "testing": 0.10, "documentation": 0.10, "devops": 0.05, "database": 0.00},
        "kavram_anahtarlari": ["react", "vue", "tailwind", "ui", "ux", "css", "responsive"],
    },
    "backend": {
        "ad": "Backend Geliştirme",
        "ikon": "⚙️",
        "aciklama": "Sunucu tarafı uygulamalar, API tasarımı, veritabanı yönetimi.",
        "agirliklar": {"backend": 0.50, "database": 0.25, "devops": 0.10, "testing": 0.10, "documentation": 0.05, "frontend": 0.00},
        "kavram_anahtarlari": ["api", "rest", "graphql", "auth", "jwt", "async", "orm"],
    },
    "mobile": {
        "ad": "Mobil Geliştirme",
        "ikon": "📱",
        "aciklama": "iOS / Android / cross-platform uygulama geliştirme.",
        "agirliklar": {"frontend": 0.50, "backend": 0.25, "database": 0.10, "testing": 0.10, "devops": 0.05, "documentation": 0.00},
        "kavram_anahtarlari": ["mobile", "react-native", "flutter", "swift", "kotlin", "android", "ios"],
    },
    "ai_ml": {
        "ad": "Yapay Zeka & ML",
        "ikon": "🤖",
        "aciklama": "Makine öğrenmesi modelleri, LLM, RAG, veri pipelines.",
        "agirliklar": {"backend": 0.35, "database": 0.20, "documentation": 0.15, "devops": 0.15, "testing": 0.10, "frontend": 0.05},
        "kavram_anahtarlari": ["llm", "ml", "embedding", "rag", "pytorch", "tensorflow", "transformer", "nlp", "vector"],
    },
    "devops": {
        "ad": "DevOps & SRE",
        "ikon": "🐳",
        "aciklama": "CI/CD, container orchestration, cloud infrastructure, monitoring.",
        "agirliklar": {"devops": 0.55, "backend": 0.20, "testing": 0.15, "documentation": 0.10, "database": 0.00, "frontend": 0.00},
        "kavram_anahtarlari": ["docker", "kubernetes", "ci", "cd", "terraform", "ansible", "monitor", "deploy"],
    },
    "data": {
        "ad": "Veri Bilimi & Analiz",
        "ikon": "📊",
        "aciklama": "Veri analizi, görselleştirme, ETL pipeline'ları, raporlama.",
        "agirliklar": {"database": 0.40, "backend": 0.25, "documentation": 0.15, "testing": 0.10, "devops": 0.10, "frontend": 0.00},
        "kavram_anahtarlari": ["pandas", "sql", "etl", "data", "analiz", "visualization", "spark", "airflow"],
    },
    "game": {
        "ad": "Oyun Geliştirme",
        "ikon": "🎮",
        "aciklama": "Oyun motoru, fizik, grafik programlama, oyun mantığı.",
        "agirliklar": {"backend": 0.40, "frontend": 0.30, "testing": 0.20, "documentation": 0.10, "devops": 0.00, "database": 0.00},
        "kavram_anahtarlari": ["unity", "unreal", "godot", "game", "fizik", "grafik", "shader"],
    },
}

KATEGORILER = ["frontend", "backend", "database", "devops", "testing", "documentation"]


# ────────────────────────────────────────────────────────────────────────────
# Yardımcılar
# ────────────────────────────────────────────────────────────────────────────

def _kullanici_profili(projeler: list[Portfolio]) -> Optional[dict]:
    """Tüm projelerin beceri_kategorileri'ni ortala, 6 kategoride 0-100 döner."""
    veriler = [p.beceri_kategorileri for p in projeler if isinstance(p.beceri_kategorileri, dict)]
    if not veriler:
        return None
    out = {}
    for k in KATEGORILER:
        skorlar = [v.get(k, 0) for v in veriler if isinstance(v.get(k, 0), (int, float))]
        out[k] = round(sum(skorlar) / len(skorlar)) if skorlar else 0
    return out


def _sektor_uyum(profil: dict, agirliklar: dict) -> int:
    """Ağırlıklı toplam — sıfırla normalize edilmiş ağırlıkları kullanır."""
    toplam_agirlik = sum(agirliklar.values()) or 1
    skor = sum(profil.get(k, 0) * (a / toplam_agirlik) for k, a in agirliklar.items())
    return max(0, min(100, round(skor)))


def _sonraki_adimlar(profil: dict, sektor: dict) -> list[str]:
    """Sektörün ağırlık verdiği ama kullanıcının zayıf olduğu kategorilere göre adım üret."""
    adimlar = []
    for kat, ag in sektor["agirliklar"].items():
        if ag >= 0.20 and profil.get(kat, 0) < 50:
            adimlar.append({
                "frontend":     "Frontend projeleri ekle (React/Vue ile UI ağırlıklı)",
                "backend":      "Backend ağırlıklı proje (API tasarımı, auth, async)",
                "database":     "Veritabanı kullanan bir proje (PostgreSQL/MongoDB)",
                "devops":       "Bir projeni Docker'a alıp CI/CD pipeline kur",
                "testing":      "Mevcut projelerine birim/entegrasyon testleri yaz",
                "documentation": "README ve dokümantasyon çalışmasına ağırlık ver",
            }.get(kat, f"{kat} alanını güçlendir"))
    # Aynı adım birden fazla kez gelmesin
    benzersiz = []
    for a in adimlar:
        if a not in benzersiz:
            benzersiz.append(a)
    return benzersiz[:3]


# ────────────────────────────────────────────────────────────────────────────
# LLM yorumu (kişiye özel paragraf)
# ────────────────────────────────────────────────────────────────────────────

async def _llm_yorum(user: User, profil: dict, top_sektorler: list[dict], kavramlar: set[str]) -> Optional[str]:
    """Gemini → Groq cascade. Başarısızsa None döner."""
    if not (GEMINI_KEY or GROQ_KEY):
        return None
    prompt = f"""Bir staj danışmanı olarak öğrenciye 2-3 cümlelik kişiye özel bir yönlendirme yaz.
Sadece düz Türkçe metin, JSON ya da liste değil.

Öğrenci adı: {user.ad}
Profil (0-100, alan skorları): {profil}
Kavramlar: {sorted(kavramlar)[:15]}
En uygun 3 sektör (uyum%): {[(s["ad"], s["uyum"]) for s in top_sektorler]}

Şu çerçevede yaz:
1) En güçlü olduğun yön ne (somut alan veya kavram).
2) Hangi sektör senin için en uygun ve neden.
3) Yakın vadede neye odaklanman seni daha hazır yapar.

Tek paragraf, 60-90 kelime. "Sen" diliyle, profesyonel ama samimi."""
    # Önce Gemini
    if GEMINI_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_KEY)
            r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
            metin = (r.text or "").strip()
            if metin:
                return metin
        except Exception:
            pass
    # Sonra Groq
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
            )
            return (r.choices[0].message.content or "").strip()
        except Exception:
            pass
    return None


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

async def sektor_kesfi(db: Session, user: User, ai_yorum: bool = True) -> dict:
    projeler = db.query(Portfolio).filter(Portfolio.student_id == user.id).all()
    profil = _kullanici_profili(projeler)

    if not profil:
        return {
            "yeterli_veri": False,
            "mesaj": "Sektör önerisi için en az 1 analiz edilmiş proje gerekli. "
                     "Profil → Projeler kısmından GitHub linkini ekleyip analiz et.",
            "kullanici_profili": None,
            "en_guclu_alan": None,
            "en_zayif_alan": None,
            "sektor_onerileri": [],
            "ai_yorum": None,
        }

    # Kavramları topla (LLM bağlamı için)
    kavramlar = set()
    for p in projeler:
        for k in (p.kavramlar or []):
            kavramlar.add(str(k).lower())

    # Sektör skorları
    skorlu = []
    for kod, s in SEKTORLER.items():
        uyum = _sektor_uyum(profil, s["agirliklar"])
        # Kavram bonusu — kullanıcının kavramları sektörün anahtarlarıyla kesişiyorsa +5/10
        ortak = sum(1 for ak in s["kavram_anahtarlari"] if any(ak in k for k in kavramlar))
        if ortak >= 3:
            uyum = min(100, uyum + 10)
        elif ortak >= 1:
            uyum = min(100, uyum + 5)
        skorlu.append({
            "kod": kod,
            "ad": s["ad"],
            "ikon": s["ikon"],
            "uyum": uyum,
            "aciklama": s["aciklama"],
            "sonraki_adimlar": _sonraki_adimlar(profil, s),
        })

    skorlu.sort(key=lambda x: x["uyum"], reverse=True)
    top3 = skorlu[:3]

    en_guclu = max(profil.items(), key=lambda x: x[1])[0]
    en_zayif = min(profil.items(), key=lambda x: x[1])[0]

    # LLM yorumu (opsiyonel)
    yorum = None
    if ai_yorum:
        yorum = await _llm_yorum(user, profil, top3, kavramlar)

    return {
        "yeterli_veri": True,
        "mesaj": "Profil analizine göre senin için en uygun sektörler belirlendi.",
        "kullanici_profili": profil,
        "en_guclu_alan": en_guclu,
        "en_zayif_alan": en_zayif,
        "sektor_onerileri": top3,
        "ai_yorum": yorum,
    }
