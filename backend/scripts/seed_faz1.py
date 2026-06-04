"""Faz 1 veritabanını sağlamlaştırır:

1) Tüm ilanların `beceri_profili`'sini pozisyona uygun şekilde doldurur (yoksa).
2) Eski kabul edilmiş başvuruları `tamamlandi=True` işaretler (timing simülasyonu).
3) Farklı öğrencilerden örnek başvuru + kabul + tamamlanma + deneyim paylaşımı üretir.

Idempotent — yeniden çalıştırılabilir, var olanı tekrar yaratmaz.
"""
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import (
    Application, ApplicationStatus, Internship, StajDeneyim,
    User, UserRole,
)


# ────────────────────────────────────────────────────────────────────────────
# 1) İlanların beceri_profili eksikleri
# ────────────────────────────────────────────────────────────────────────────

POZISYON_PROFILLERI = {
    "backend": {
        "Yazılım Dilleri":    85, "Web Teknolojileri": 75,
        "Veritabanı":         80, "DevOps & Araçlar":   55,
        "Veri & YZ":          25, "Gömülü & Donanım":   0,
        "Yabancı Dil":        65, "Yönetim & İletişim": 45,
    },
    "frontend": {
        "Yazılım Dilleri":    60, "Web Teknolojileri": 95,
        "Veritabanı":         30, "DevOps & Araçlar":   30,
        "Veri & YZ":          10, "Gömülü & Donanım":   0,
        "Yabancı Dil":        65, "Yönetim & İletişim": 50,
    },
    "veri": {
        "Yazılım Dilleri":    70, "Web Teknolojileri": 30,
        "Veritabanı":         85, "DevOps & Araçlar":   45,
        "Veri & YZ":          90, "Gömülü & Donanım":   0,
        "Yabancı Dil":        60, "Yönetim & İletişim": 40,
    },
    "yapay_zeka": {
        "Yazılım Dilleri":    75, "Web Teknolojileri": 35,
        "Veritabanı":         60, "DevOps & Araçlar":   50,
        "Veri & YZ":          95, "Gömülü & Donanım":   10,
        "Yabancı Dil":        70, "Yönetim & İletişim": 40,
    },
    "endustri": {
        "Yazılım Dilleri":    40, "Web Teknolojileri": 30,
        "Veritabanı":         50, "DevOps & Araçlar":   35,
        "Veri & YZ":          45, "Gömülü & Donanım":   40,
        "Yabancı Dil":        60, "Yönetim & İletişim": 70,
    },
    "mimari": {
        "Yazılım Dilleri":    30, "Web Teknolojileri": 25,
        "Veritabanı":         30, "DevOps & Araçlar":   25,
        "Veri & YZ":          20, "Gömülü & Donanım":   15,
        "Yabancı Dil":        60, "Yönetim & İletişim": 65,
    },
    "default": {
        "Yazılım Dilleri":    50, "Web Teknolojileri": 50,
        "Veritabanı":         50, "DevOps & Araçlar":   40,
        "Veri & YZ":          40, "Gömülü & Donanım":   20,
        "Yabancı Dil":        55, "Yönetim & İletişim": 50,
    },
}


def _pozisyon_tipi(pozisyon: str) -> str:
    p = pozisyon.lower()
    if "backend" in p:               return "backend"
    if "frontend" in p:              return "frontend"
    if "veri" in p or "data" in p:   return "veri"
    if "yapay" in p or "ai" in p or "ml" in p: return "yapay_zeka"
    if "endüstri" in p or "industri" in p:     return "endustri"
    if "mimari" in p or "çizim" in p:          return "mimari"
    return "default"


def doldur_ilan_profilleri(db) -> int:
    ilanlar = db.query(Internship).filter(Internship.beceri_profili.is_(None)).all()
    for i in ilanlar:
        i.beceri_profili = POZISYON_PROFILLERI[_pozisyon_tipi(i.pozisyon)]
    db.commit()
    return len(ilanlar)


# ────────────────────────────────────────────────────────────────────────────
# 2) Kabul edilmiş eski başvuruları tamamlandı işaretle
# ────────────────────────────────────────────────────────────────────────────

def tamamlandi_isaretle(db) -> int:
    """Eski kabul başvuruların tümünü tamamlandı yap (test için)."""
    apps = db.query(Application).filter(
        Application.durum == ApplicationStatus.kabul,
        Application.tamamlandi == False,
    ).all()
    for a in apps:
        a.tamamlandi = True
        if not a.karar_tarihi:
            a.karar_tarihi = datetime.now(timezone.utc) - timedelta(days=180)
    db.commit()
    return len(apps)


# ────────────────────────────────────────────────────────────────────────────
# 3) Farklı öğrencilerden örnek başvuru + kabul + deneyim
# ────────────────────────────────────────────────────────────────────────────

# (student_email, internship_id, donem, puan, tavsiye, departman, yorum, teknolojiler)
ORNEK_DENEYIMLER = [
    ("ogrenci1@btu.edu.tr", 1, "2025-Yaz", 4, True,  "Backend Team",
     "Gerçek projelerde yer aldım, mentor desteği çok iyiydi. PR review süreci öğretici.",
     ["FastAPI", "PostgreSQL", "Docker", "Redis"]),
    ("test2@btu.edu.tr",    3, "2025-Yaz", 5, True,  "Frontend",
     "React ve Tailwind ağırlıklı çalıştık. Tasarım sistemi kurulumunda görev aldım.",
     ["React", "TypeScript", "Tailwind", "Storybook"]),
    ("zeynep_e2e@btu.edu.tr", 2, "2025-Yaz", 3, True,  "Veri & Analiz",
     "Pandas ile ETL pipeline yazdım. Veriyi temizleme süreci öğretici ama yoğundu.",
     ["Python", "Pandas", "SQL", "Airflow"]),
    ("ogrenci3@btu.edu.tr", 6, "2026-Bahar", 5, True, "AI/ML",
     "LLM tabanlı bir RAG sistemi kurduk. Embedding ve vector DB ile tanıştım.",
     ["Python", "LangChain", "Chroma", "Gemini"]),
    ("ogrenci4@btu.edu.tr", 1, "2025-Kış", 2, False, "Backend Team",
     "Beklediğim mentorluk olmadı, çoğu zaman yalnız çalıştım. Süreç biraz dağınıktı.",
     ["Python", "PostgreSQL"]),
    ("uye_6ab8c4@btu.edu.tr", 5, "2026-Yaz", 4, True, "Yazılım",
     "Karışık projelerde dönerek çalıştım. Geniş bakış açısı kazandırdı.",
     ["JavaScript", "Node.js", "Express", "MongoDB"]),
]


def ornek_deneyimler_olustur(db) -> dict:
    """Her satır için:
    1. Öğrenciyi bul
    2. İlanı bul, company'sini al
    3. Yoksa Application yarat (kabul + tamamlandı)
    4. Yoksa StajDeneyim ekle
    """
    stat = {"yeni_app": 0, "yeni_deneyim": 0, "atlanan": 0}
    for email, ilan_id, donem, puan, tavsiye, dep, yorum, tek in ORNEK_DENEYIMLER:
        ogr = db.query(User).filter(User.email == email).first()
        ilan = db.query(Internship).filter(Internship.id == ilan_id).first()
        if not ogr or not ilan:
            stat["atlanan"] += 1
            continue

        # 1) Application: yoksa yarat (kabul + tamamlandı)
        app = db.query(Application).filter(
            Application.student_id == ogr.id,
            Application.internship_id == ilan_id,
        ).first()
        if not app:
            app = Application(
                student_id=ogr.id,
                internship_id=ilan_id,
                durum=ApplicationStatus.kabul,
                tamamlandi=True,
                karar_tarihi=datetime.now(timezone.utc) - timedelta(days=240),
                on_yazi="Bu pozisyonda staj yapmak istiyorum.",
            )
            db.add(app)
            db.flush()
            stat["yeni_app"] += 1
        else:
            if app.durum != ApplicationStatus.kabul:
                app.durum = ApplicationStatus.kabul
            if not app.tamamlandi:
                app.tamamlandi = True

        # 2) Deneyim: aynı dönem için yoksa yarat
        var = db.query(StajDeneyim).filter(
            StajDeneyim.company_id == ilan.company_id,
            StajDeneyim.paylasan_id == ogr.id,
            StajDeneyim.donem == donem,
        ).first()
        if var:
            continue

        d = StajDeneyim(
            company_id=ilan.company_id,
            paylasan_id=ogr.id,
            application_id=app.id,
            bolum_kodu=ogr.bolum_kodu or "bilgisayar",
            donem=donem,
            calistigi_departman=dep,
            genel_yorum=yorum,
            ogrendigi_teknolojiler=tek,
            puan=puan,
            tavsiye_eder_mi=tavsiye,
        )
        db.add(d)
        stat["yeni_deneyim"] += 1

    db.commit()
    return stat


# ────────────────────────────────────────────────────────────────────────────
# Ana
# ────────────────────────────────────────────────────────────────────────────

def main():
    db = SessionLocal()
    try:
        n1 = doldur_ilan_profilleri(db)
        print(f"1) İlanlara beceri_profili eklendi: {n1}")

        n2 = tamamlandi_isaretle(db)
        print(f"2) Kabul başvuruları tamamlandı işaretlendi: {n2}")

        s = ornek_deneyimler_olustur(db)
        print(f"3) Yeni başvuru: {s['yeni_app']}, yeni deneyim: {s['yeni_deneyim']}, atlanan: {s['atlanan']}")

        # Özet
        print()
        print("=== SON DURUM ===")
        from sqlalchemy import func as fn
        ilan_top   = db.query(fn.count(Internship.id)).scalar()
        ilan_dolu  = db.query(fn.count(Internship.id)).filter(Internship.beceri_profili.isnot(None)).scalar()
        kabul_top  = db.query(fn.count(Application.id)).filter(Application.durum == ApplicationStatus.kabul).scalar()
        tam_top    = db.query(fn.count(Application.id)).filter(Application.tamamlandi == True).scalar()
        den_top    = db.query(fn.count(StajDeneyim.id)).scalar()
        print(f"  İlanlar:    {ilan_top} (beceri_profili dolu: {ilan_dolu})")
        print(f"  Kabuller:   {kabul_top} (tamamlandı: {tam_top})")
        print(f"  Deneyimler: {den_top}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
