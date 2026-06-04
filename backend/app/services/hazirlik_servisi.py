"""Öğrencinin staj hazırlık skorunu hesaplar — 0-100 arası bir genel skor,
5 alt kategori puanı ve gelişim önerileri döner. Mevcut DB verisinden anlık
hesaplanır (kalıcı tablo yok).

Skorlama:
- Profil Tamamlığı (20):  ad/bolum/telefon/github/foto/öğrenci no/CV özet
- CV İçeriği (25):         eğitim, deneyim, beceriler(≥3), diller
- Portfolio (25):          proje sayısı, ortalama teknik_yetkinlik, production seviye
- Sertifikalar (15):       toplam, doğrulanmış, 3+ doğrulanmış
- Aktivite (15):           başvuru, grup üyeliği, kariyer haritası, defter, BTK
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Application, Certificate, CV, DiaryEntry,
    GroupMembership, Portfolio, Roadmap, User,
)


# ────────────────────────────────────────────────────────────────────────────
# Yardımcılar
# ────────────────────────────────────────────────────────────────────────────

def _len_or_zero(x) -> int:
    """JSONB liste ya da None olabilir."""
    try:
        return len(x or [])
    except TypeError:
        return 0


def _puan(skor: int, max_skor: int) -> int:
    """0 ile max arasına kıstır."""
    return max(0, min(max_skor, skor))


# ────────────────────────────────────────────────────────────────────────────
# Alt skor hesaplayıcılar
# ────────────────────────────────────────────────────────────────────────────

def _profil_skoru(user: User, cv: Optional[CV]) -> tuple[int, list[dict]]:
    """0-20 puan. Eksikler için somut öneri döner."""
    skor = 0
    oneriler = []

    if user.ad and user.soyad:
        skor += 2
    if user.bolum:
        skor += 2
    else:
        oneriler.append({"baslik": "Bölümünü ekle", "puan": 2, "yol": "/profile"})
    if user.telefon:
        skor += 2
    else:
        oneriler.append({"baslik": "Telefon numarası ekle", "puan": 2, "yol": "/profile"})
    if user.github_username:
        skor += 4
    else:
        oneriler.append({"baslik": "GitHub kullanıcı adını ekle", "puan": 4, "yol": "/profile"})
    if user.profil_foto_url:
        skor += 2
    else:
        oneriler.append({"baslik": "Profil fotoğrafı ekle", "puan": 2, "yol": "/profile"})
    if user.ogrenci_no:
        skor += 2
    else:
        oneriler.append({"baslik": "Öğrenci numarası ekle", "puan": 2, "yol": "/profile"})
    if cv and cv.ozet and len(cv.ozet.strip()) > 30:
        skor += 6
    else:
        oneriler.append({"baslik": "CV özetini doldur (en az 30 karakter)", "puan": 6, "yol": "/profile"})

    return _puan(skor, 20), oneriler


def _cv_skoru(cv: Optional[CV]) -> tuple[int, list[dict]]:
    """0-25 puan."""
    if not cv:
        return 0, [{"baslik": "CV oluştur (eğitim/deneyim/beceriler)", "puan": 25, "yol": "/profile"}]

    skor = 0
    oneriler = []

    if _len_or_zero(cv.egitim) >= 1:
        skor += 5
    else:
        oneriler.append({"baslik": "Eğitim bilgisi ekle", "puan": 5, "yol": "/profile"})

    if _len_or_zero(cv.deneyim) >= 1:
        skor += 5
    else:
        oneriler.append({"baslik": "Deneyim/proje ekle", "puan": 5, "yol": "/profile"})

    bec = _len_or_zero(cv.beceriler)
    if bec >= 3:
        skor += 8
        if bec >= 8:
            skor += 3  # bonus
    elif bec > 0:
        skor += 3
        oneriler.append({"baslik": f"En az 3 beceri ekle (şu an {bec})", "puan": 5, "yol": "/career-map"})
    else:
        oneriler.append({"baslik": "Beceri listesi oluştur (Kariyer Haritası → AI Profil)", "puan": 8, "yol": "/career-map"})

    if _len_or_zero(cv.diller) >= 1:
        skor += 4
    else:
        oneriler.append({"baslik": "Yabancı dil bilgisi ekle", "puan": 4, "yol": "/profile"})

    return _puan(skor, 25), oneriler


def _portfolio_skoru(projeler: list[Portfolio]) -> tuple[int, list[dict]]:
    """0-25 puan."""
    skor = 0
    oneriler = []
    sayi = len(projeler)

    if sayi >= 1:
        skor += 5
    else:
        oneriler.append({"baslik": "İlk projeni ekle (GitHub link analizi)", "puan": 5, "yol": "/profile"})
        return 0, oneriler

    if sayi >= 3:
        skor += 5
    else:
        oneriler.append({"baslik": f"Daha fazla proje ekle (şu an {sayi}, hedef 3+)", "puan": 5, "yol": "/profile"})

    analiz_edilen = [p for p in projeler if (p.teknik_yetkinlik or 0) > 0]
    if analiz_edilen:
        ort = sum(p.teknik_yetkinlik for p in analiz_edilen) / len(analiz_edilen)
        if ort >= 30:
            skor += 5
        if ort >= 60:
            skor += 5
        else:
            oneriler.append({
                "baslik": f"Projelerinin teknik yetkinliğini artır (ortalama %{round(ort)})",
                "puan": 5, "yol": "/profile"
            })
    else:
        oneriler.append({"baslik": "Projelerini analiz et (yeniden analiz butonu)", "puan": 10, "yol": "/profile"})

    production = [p for p in projeler if p.seviye == "production"]
    if production:
        skor += 5
    else:
        oneriler.append({
            "baslik": "Üretim seviyesi (deploy edilmiş, dokümante) bir proje ekle",
            "puan": 5, "yol": "/profile"
        })

    return _puan(skor, 25), oneriler


def _sertifika_skoru(certs: list[Certificate]) -> tuple[int, list[dict]]:
    """0-15 puan."""
    skor = 0
    oneriler = []

    if not certs:
        oneriler.append({"baslik": "İlk sertifikanı ekle (BTK doğrulamalı tercih edilir)", "puan": 15, "yol": "/profile"})
        return 0, oneriler

    skor += 5
    dogrulanmis = [c for c in certs if c.dogrulanmis]
    if dogrulanmis:
        skor += 5
        if len(dogrulanmis) >= 3:
            skor += 5
        else:
            oneriler.append({
                "baslik": f"3+ doğrulanmış sertifikaya ulaş (şu an {len(dogrulanmis)})",
                "puan": 5, "yol": "/profile"
            })
    else:
        oneriler.append({"baslik": "Sertifikalarını doğrulat (BTK PDF yükle)", "puan": 10, "yol": "/profile"})

    return _puan(skor, 15), oneriler


def _aktivite_skoru(db: Session, user_id: int, certs: list[Certificate]) -> tuple[int, list[dict]]:
    """0-15 puan."""
    skor = 0
    oneriler = []

    if db.query(Application.id).filter(Application.student_id == user_id).first():
        skor += 3
    else:
        oneriler.append({"baslik": "İlk staj başvurunu yap", "puan": 3, "yol": "/internships"})

    if db.query(GroupMembership.id).filter(GroupMembership.user_id == user_id).first():
        skor += 3
    else:
        oneriler.append({"baslik": "Bir gruba katıl veya kur", "puan": 3, "yol": "/groups"})

    if db.query(Roadmap.id).filter(Roadmap.student_id == user_id).first():
        skor += 3
    else:
        oneriler.append({"baslik": "Hedef şirket için yol haritası oluştur", "puan": 3, "yol": "/career-map"})

    if db.query(DiaryEntry.id).filter(DiaryEntry.student_id == user_id).first():
        skor += 3
    else:
        oneriler.append({"baslik": "Staj defteri girişi yaz (kabul aldığında)", "puan": 3, "yol": "/internship-book"})

    if any(c.veren_kurum == "btk" and c.dogrulanmis for c in certs):
        skor += 3
    else:
        oneriler.append({"baslik": "En az 1 BTK doğrulamalı sertifika ekle", "puan": 3, "yol": "/profile"})

    return _puan(skor, 15), oneriler


# ────────────────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ────────────────────────────────────────────────────────────────────────────

def hazirlik_skoru_hesapla(db: Session, user: User) -> dict:
    """Tüm alt skorları hesapla, genel skor + sıralı önerileri döner."""
    cv      = db.query(CV).filter(CV.student_id == user.id).first()
    projeler = db.query(Portfolio).filter(Portfolio.student_id == user.id).all()
    certs    = db.query(Certificate).filter(Certificate.student_id == user.id).all()

    profil_p, profil_o = _profil_skoru(user, cv)
    cv_p, cv_o         = _cv_skoru(cv)
    portf_p, portf_o   = _portfolio_skoru(projeler)
    cert_p, cert_o     = _sertifika_skoru(certs)
    akt_p, akt_o       = _aktivite_skoru(db, user.id, certs)

    toplam = profil_p + cv_p + portf_p + cert_p + akt_p

    # Önerileri puan büyüklüğüne göre sırala (en çok katkıdan en aza)
    tum_oneriler = profil_o + cv_o + portf_o + cert_o + akt_o
    tum_oneriler.sort(key=lambda o: o.get("puan", 0), reverse=True)

    # Seviye etiketi
    if toplam >= 85:
        seviye, mesaj = "hazir",    "Staj sezonuna hazırsın! Başvurulara başlayabilirsin."
    elif toplam >= 65:
        seviye, mesaj = "iyi_yolda", "İyi yoldasın — birkaç adım daha eksiklerini tamamlar."
    elif toplam >= 40:
        seviye, mesaj = "gelisiyor", "Temellerin oturmuş, biraz daha içerik ekle."
    else:
        seviye, mesaj = "baslangic", "Profilini doldurarak başla — küçük adımlar büyük fark yaratır."

    # Eğer mevcut skor 100'e çıkmış ve öneri kalmamışsa
    if toplam >= 100 and not tum_oneriler:
        tum_oneriler.append({"baslik": "🎉 Maksimum hazırlık — profilini güncel tut!", "puan": 0, "yol": "/profile"})

    return {
        "toplam_skor": toplam,
        "seviye": seviye,
        "mesaj":  mesaj,
        "alt_skorlar": [
            {"kategori": "Profil Tamamlığı", "skor": profil_p, "max": 20, "ikon": "👤"},
            {"kategori": "CV İçeriği",        "skor": cv_p,     "max": 25, "ikon": "📄"},
            {"kategori": "Portfolio",         "skor": portf_p,  "max": 25, "ikon": "🚀"},
            {"kategori": "Sertifikalar",      "skor": cert_p,   "max": 15, "ikon": "🏅"},
            {"kategori": "Aktivite",          "skor": akt_p,    "max": 15, "ikon": "⚡"},
        ],
        "oneriler": tum_oneriler[:8],   # en değerli 8 öneri
    }
