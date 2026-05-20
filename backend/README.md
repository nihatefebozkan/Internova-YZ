# InternovaYZ — Python/FastAPI Backend

Bursa Teknik Üniversitesi kariyer ve staj platformunun Python/FastAPI tabanlı backend servisi.

---

## Gereksinimler

- Python 3.12+
- PostgreSQL 16 (Docker ile çalışıyor — proje kökündeki `docker-compose.yml`)
- Sanal ortam (`venv/`)

---

## Backend'i Ayağa Kaldırma

```bash
# Proje kökünden Docker servisini başlat
docker compose up -d

# backend/ dizinine gir
cd backend

# Sanal ortamı aktif et
source venv/bin/activate

# Bağımlılıkları kur (ilk sefer)
pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic python-dotenv bcrypt

# Sunucuyu başlat (port 8001 — 8000 Portainer tarafından kullanılıyor)
uvicorn app.main:app --reload --port 8001
```

Sunucu ayağa kalktıktan sonra:
- Swagger UI: http://localhost:8001/docs
- Health check: http://localhost:8001/health

> **Not:** Port 8000 sistemde Portainer tarafından kullanılmaktadır. Sunucu varsayılan olarak 8001'de başlatılmalıdır.

---

## Migration İşlemleri

### Migration oluşturma
Model değişikliklerinden sonra yeni migration üret:

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "açıklayıcı bir mesaj"
```

### Migration uygulama
```bash
alembic upgrade head
```

### Son migration'ı geri alma
```bash
alembic downgrade -1
```

---

## Yeni Model Eklerken

1. `app/models.py`'ye yeni sınıfı ekle (`Base`'den türet)
2. Gerekli ilişkileri (`relationship`, `ForeignKey`) kur
3. `alembic revision --autogenerate -m "yeni tablo: ornek"` çalıştır
4. `alembic upgrade head` ile uygula
5. Gerekirse `app/seed.py`'yi güncelle

---

## Seed Data

Test verilerini veritabanına yüklemek için:

```bash
cd backend
source venv/bin/activate
python -m app.seed
```

**Oluşturulan test hesapları (şifre: `Test1234!`):**

| E-posta | Rol |
|---|---|
| `ogrenci@btu.edu.tr` | student |
| `ogretmen@btu.edu.tr` | teacher |
| `ik@teknopark.com.tr` | company |

---

## Endpoint Testi

Swagger UI üzerinden test (tarayıcı):
```
http://localhost:8001/docs
```

`curl` ile test:
```bash
# Health check
curl http://localhost:8001/health

# Kullanıcıları listele
curl http://localhost:8001/users
```

---

## Proje Yapısı

```
backend/
├── app/
│   ├── __init__.py
│   ├── database.py      # Engine, SessionLocal, Base
│   ├── models.py        # 14 SQLAlchemy modeli
│   ├── main.py          # FastAPI uygulaması
│   └── seed.py          # Test verisi scripti
├── alembic/
│   ├── env.py           # Migration ortamı
│   └── versions/        # Migration dosyaları
├── alembic.ini
├── .env                 # DATABASE_URL
└── venv/
```

---

## Veritabanı Tabloları

| Tablo | Açıklama |
|---|---|
| `users` | Öğrenci, öğretmen ve şirket kullanıcıları |
| `internships` | Şirket staj ilanları |
| `applications` | Öğrenci başvuruları |
| `cvs` | Öğrenci CV'leri (JSONB) |
| `certificates` | OCR doğrulamalı sertifikalar |
| `portfolios` | Portfolyo projeleri |
| `diary_entries` | LLM destekli staj defteri |
| `badges` | Platform rozetleri |
| `user_badges` | Kullanıcı-rozet ilişkisi |
| `events` | Etkinlik takvimi |
| `event_attendees` | Etkinlik katılımcıları |
| `project_teams` | Öğrenci proje takımları |
| `team_members` | Takım üyeleri |
| `team_applications` | Takıma başvurular |
