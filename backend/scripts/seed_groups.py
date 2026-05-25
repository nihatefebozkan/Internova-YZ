"""Örnek grup + proje seed — ogrenci@btu.edu.tr (id=1) sahipliğinde."""
from app.database import SessionLocal
from app.models import (
    Group, GroupMembership, Project, ProjectDepartment,
)

OWNER_EMAIL = "ogrenci@btu.edu.tr"


def main():
    db = SessionLocal()
    try:
        # owner
        from app.models import User
        owner = db.query(User).filter(User.email == OWNER_EMAIL).first()
        if not owner:
            print(f"❌ {OWNER_EMAIL} bulunamadı"); return

        # ---------------- GRUPLAR ----------------
        gruplar_data = [
            {
                "ad": "BTÜ Web Geliştirme Topluluğu",
                "aciklama": "Modern web teknolojileriyle gerçek dünya projeleri geliştiren bir öğrenci topluluğu. React, Next.js, Node.js, FastAPI ile çalışıyoruz.",
                "kategori": "web",
                "max_uye": 15,
            },
            {
                "ad": "Yapay Zeka & Veri Bilimi Lab",
                "aciklama": "Yapay zeka, makine öğrenmesi ve veri bilimi projelerini öğrenci kalabalığıyla hayata geçiriyoruz. Python, PyTorch, scikit-learn ekosistemi.",
                "kategori": "ai",
                "max_uye": 12,
            },
        ]
        gruplar = []
        for gd in gruplar_data:
            mevcut = db.query(Group).filter(Group.ad == gd["ad"]).first()
            if mevcut:
                gruplar.append(mevcut); continue
            g = Group(owner_id=owner.id, **gd)
            db.add(g); db.flush()
            db.add(GroupMembership(group_id=g.id, user_id=owner.id, rol="owner"))
            gruplar.append(g)
        db.commit()
        for g in gruplar:
            db.refresh(g)
        print(f"✅ {len(gruplar)} grup hazır")

        # ---------------- PROJELER ----------------
        projeler_data = [
            # ---- Grup 1: Web ----
            {
                "grup_idx": 0,
                "ad": "StajTakipPro — Üniversite Staj Yönetim Sistemi",
                "kisa_aciklama": "Öğrenci, akademisyen ve şirketleri bir araya getiren modern staj yönetim platformu.",
                "kategori": "web", "sure": "3 ay", "seviye": "orta", "haftalik_saat": 12,
                "hedef": "BTÜ öğrencilerinin staj süreçlerini dijitalleştirmek; başvuru, onay, defter takibi ve değerlendirme akışlarını tek platformda toplamak.",
                "pitch": "Şu an staj süreçleri Excel ve e-posta üzerinden yürüyor. Biz bunu modern bir web uygulamasına taşıyıp tüm paydaşlar için zaman kazandıracağız.",
                "gereksinimler": "Temel React veya FastAPI bilgisi; Git/GitHub kullanımı; haftada en az 10 saat ayırabilme.",
                "github_var": True,
                "departments": [
                    {"ad": "Frontend", "gereken_kisi": 2, "beceri_etiketleri": ["react", "tailwind", "typescript"],
                     "beklentiler": "Component-based UI tasarlama, REST API entegrasyonu, responsive layout."},
                    {"ad": "Backend", "gereken_kisi": 2, "beceri_etiketleri": ["python", "fastapi", "postgresql"],
                     "beklentiler": "REST endpoint tasarımı, SQLAlchemy ile model yönetimi, JWT auth."},
                    {"ad": "UI/UX", "gereken_kisi": 1, "beceri_etiketleri": ["figma", "tasarim"],
                     "beklentiler": "Wireframe ve high-fidelity mockup çıkarma, kullanıcı testleri."},
                ],
            },
            {
                "grup_idx": 0,
                "ad": "KampüsMarket — Öğrenciler İçin İkinci El Pazaryeri",
                "kisa_aciklama": "BTÜ kampüsünde ders kitabı, elektronik ve kıyafet alışverişi için güvenli bir ikinci el pazarı.",
                "kategori": "web", "sure": "3 ay", "seviye": "baslangic", "haftalik_saat": 8,
                "hedef": "Öğrencilerin ders sonu kalan eşyalarını ekonomik şekilde devredebilecekleri, kampüs-içi takas ve satış platformu kurmak.",
                "pitch": "Sahibinden gibi devasa siteler kampüs için fazla. Biz daha küçük, güvenli ve sadece BTÜ e-postalı kullanıcıların girebileceği bir platform yapıyoruz.",
                "gereksinimler": "Temel HTML/CSS, herhangi bir JS framework (öğrenmeye açıklık yeterli).",
                "github_var": True,
                "departments": [
                    {"ad": "Frontend", "gereken_kisi": 2, "beceri_etiketleri": ["react", "css"],
                     "beklentiler": "Liste/filtre arayüzü, mobil uyumlu kart tasarımı."},
                    {"ad": "Backend", "gereken_kisi": 1, "beceri_etiketleri": ["nodejs", "express", "mongodb"],
                     "beklentiler": "Auth, ilan CRUD, görsel yükleme."},
                ],
            },
            {
                "grup_idx": 0,
                "ad": "DersNotuPaylaşım — Açık Eğitim Platformu",
                "kisa_aciklama": "Öğrencilerin ders notlarını paylaştığı, oylama ve yorum sistemiyle kalitesi artan açık platform.",
                "kategori": "web", "sure": "6 ay", "seviye": "orta", "haftalik_saat": 10,
                "hedef": "Bilgiyi paylaşımı teşvik eden, en iyi notları öne çıkaran sosyal bir öğrenme platformu kurmak.",
                "pitch": "Notlar WhatsApp'ta dolaşıyor; kayboluyor, kalitesi belirsiz. Açık bir platformla bu notları kalıcı ve kategorize hale getirelim.",
                "gereksinimler": "Git, herhangi bir JS framework, sosyal medya UX'ine ilgi.",
                "github_var": True,
                "departments": [
                    {"ad": "Frontend", "gereken_kisi": 2, "beceri_etiketleri": ["nextjs", "react", "tailwind"],
                     "beklentiler": "SSR, Markdown render, ileri seviye filtreleme."},
                    {"ad": "Backend", "gereken_kisi": 1, "beceri_etiketleri": ["nodejs", "postgresql"],
                     "beklentiler": "İçerik moderasyonu, full-text arama, oylama mantığı."},
                    {"ad": "DevOps", "gereken_kisi": 1, "beceri_etiketleri": ["docker", "ci-cd"],
                     "beklentiler": "CI/CD pipeline, container deploy, gözlem (logs/metrics)."},
                ],
            },
            # ---- Grup 2: AI ----
            {
                "grup_idx": 1,
                "ad": "Kariyer Asistanı — Gemini Tabanlı CV Mentoru",
                "kisa_aciklama": "Öğrencinin CV'sini analiz edip hedef pozisyona göre öneri veren AI mentor.",
                "kategori": "ai", "sure": "3 ay", "seviye": "ileri", "haftalik_saat": 14,
                "hedef": "Öğrencilerin CV'lerini hedef ilan tanımına göre AI ile değerlendirip skor + somut iyileştirme önerileri sunan akıllı asistan kurmak.",
                "pitch": "İlanlardaki gereksinim listesi ile CV içeriğini eşleştiren, hangi becerilerin eksik olduğunu söyleyen bir mentor LLM hazırlıyoruz.",
                "gereksinimler": "Python ileri, LLM prompt engineering, vektör veritabanlarına aşinalık.",
                "github_var": True,
                "departments": [
                    {"ad": "ML Engineer", "gereken_kisi": 2, "beceri_etiketleri": ["python", "llm", "rag", "vector-db"],
                     "beklentiler": "Prompt tasarımı, RAG pipeline, embedding modelleri ile çalışma."},
                    {"ad": "Backend", "gereken_kisi": 1, "beceri_etiketleri": ["fastapi", "celery", "redis"],
                     "beklentiler": "Async job kuyruğu, LLM çağrılarını arka planda çalıştırma."},
                    {"ad": "Frontend", "gereken_kisi": 1, "beceri_etiketleri": ["react", "tailwind"],
                     "beklentiler": "CV görselleştirme, eksik beceriler için interaktif öneri arayüzü."},
                ],
            },
            {
                "grup_idx": 1,
                "ad": "BTÜ Akademik Soru-Cevap RAG Botu",
                "kisa_aciklama": "Üniversite yönetmeliği, ders kataloğu ve form bilgilerine vakıf bir öğrenci asistanı.",
                "kategori": "ai", "sure": "3 ay", "seviye": "orta", "haftalik_saat": 10,
                "hedef": "Öğrencilerin yönetmelik, ders, transkript gibi konularda 7/24 cevap alabileceği RAG tabanlı chatbot geliştirmek.",
                "pitch": "Öğrenci işlerine giden sorularının %80'i yönetmelikte yazıyor. Biz bunu LLM + chunk + retrieval ile otomatik cevaplayan bir bot yapıyoruz.",
                "gereksinimler": "Python orta, embedding ve chunking kavramları, doküman temizliği.",
                "github_var": True,
                "departments": [
                    {"ad": "ML Engineer", "gereken_kisi": 2, "beceri_etiketleri": ["python", "rag", "embeddings", "chromadb"],
                     "beklentiler": "Chunking stratejisi, retrieval kalitesi, evaluation."},
                    {"ad": "Veri Mühendisi", "gereken_kisi": 1, "beceri_etiketleri": ["python", "pdf", "data-cleaning"],
                     "beklentiler": "PDF / web crawl ile doküman çekme, temizleme."},
                ],
            },
        ]

        olusturulan = 0
        for pd in projeler_data:
            gid = gruplar[pd["grup_idx"]].id
            mevcut = db.query(Project).filter(Project.ad == pd["ad"], Project.group_id == gid).first()
            if mevcut:
                continue
            deps = pd.pop("departments")
            grup_idx = pd.pop("grup_idx")
            p = Project(group_id=gid, owner_id=owner.id, **pd)
            db.add(p); db.flush()
            for d in deps:
                db.add(ProjectDepartment(project_id=p.id, **d))
            olusturulan += 1
        db.commit()
        print(f"✅ {olusturulan} yeni proje eklendi")

        # ---- özet ----
        print("\n--- ÖZET ---")
        for g in gruplar:
            db.refresh(g)
            pcount = db.query(Project).filter(Project.group_id == g.id).count()
            print(f"  [#{g.id}] {g.ad}  →  {pcount} proje")

    finally:
        db.close()


if __name__ == "__main__":
    main()
