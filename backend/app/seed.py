# Test verilerini veritabanına yükler: 3 kullanıcı, 2 staj ilanı.

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from datetime import date

from app.database import SessionLocal
from app.models import (
    Internship,
    InternshipStatus,
    User,
    UserRole,
)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def seed():
    db = SessionLocal()
    try:
        # --- Kullanıcılar -------------------------------------------------------
        ogrenci = User(
            email="ogrenci@btu.edu.tr",
            password_hash=hash_password("Test1234!"),
            role=UserRole.student,
            ad="Ayşe",
            soyad="Yılmaz",
            bolum="Bilgisayar Mühendisliği",
            ogrenci_no="2021060001",
            email_dogrulandi=True,
            aktif=True,
        )
        ogretmen = User(
            email="ogretmen@btu.edu.tr",
            password_hash=hash_password("Test1234!"),
            role=UserRole.teacher,
            ad="Prof. Dr. Mehmet",
            soyad="Kaya",
            bolum="Bilgisayar Mühendisliği",
            email_dogrulandi=True,
            aktif=True,
        )
        sirket = User(
            email="ik@teknopark.com.tr",
            password_hash=hash_password("Test1234!"),
            role=UserRole.company,
            ad="Teknoloji A.Ş.",
            soyad="İK Departmanı",
            email_dogrulandi=True,
            aktif=True,
        )
        db.add_all([ogrenci, ogretmen, sirket])
        db.flush()  # id'leri almak için

        # --- Staj İlanları ------------------------------------------------------
        ilan1 = Internship(
            company_id=sirket.id,
            pozisyon="Backend Geliştirici Stajyeri",
            departman="Yazılım",
            konum="Bursa / Uzaktan",
            aciklama="Python ve FastAPI ile REST API geliştirme stajı.",
            gereksinimler="Python, Git, temel SQL bilgisi",
            kontenjan=3,
            basvuru_son_tarih=date(2026, 6, 30),
            staj_baslangic=date(2026, 7, 1),
            staj_bitis=date(2026, 8, 31),
            ucret_var_mi=True,
            durum=InternshipStatus.aktif,
        )
        ilan2 = Internship(
            company_id=sirket.id,
            pozisyon="Veri Analisti Stajyeri",
            departman="Veri Bilimi",
            konum="Bursa",
            aciklama="Veri analizi ve raporlama stajı.",
            gereksinimler="Python, Pandas, Excel",
            kontenjan=2,
            basvuru_son_tarih=date(2026, 6, 15),
            staj_baslangic=date(2026, 7, 1),
            staj_bitis=date(2026, 9, 30),
            ucret_var_mi=False,
            durum=InternshipStatus.aktif,
        )
        db.add_all([ilan1, ilan2])

        db.commit()
        print("Seed tamamlandı:")
        print(f"  Kullanıcılar: öğrenci ({ogrenci.email}), öğretmen ({ogretmen.email}), şirket ({sirket.email})")
        print(f"  Staj ilanları: {ilan1.pozisyon}, {ilan2.pozisyon}")
        print("\nTest şifresi (tüm hesaplar): Test1234!")

    except Exception as exc:
        db.rollback()
        print(f"Seed hatası: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
