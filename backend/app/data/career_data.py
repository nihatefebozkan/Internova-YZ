# Bölüme göre beceri kategorileri ve rol haritaları

# ── Bölüm listesi ────────────────────────────────────────────────
BOLUMLER = {
    "bilgisayar": "Bilgisayar Mühendisliği",
    "makine":     "Makine Mühendisliği",
    "insaat":     "İnşaat Mühendisliği",
    "elektrik":   "Elektrik-Elektronik Mühendisliği",
    "endustri":   "Endüstri Mühendisliği",
    "gida":       "Gıda Mühendisliği",
    "gemi":       "Gemi İnşaatı ve Gemi Makineleri Mühendisliği",
    "mimarlik":   "Mimarlık",
    "isletme":    "İşletme",
    "psikoloji":  "Psikoloji",
    "sosyoloji":  "Sosyoloji",
}

# ── Bölüme göre radar kategorileri (8 kategori her bölüm için) ───
BOLUM_KATEGORILERI: dict[str, list[str]] = {
    "bilgisayar": [
        "Yazılım Dilleri", "Web Teknolojileri", "Veritabanı",
        "DevOps & Araçlar", "Yapay Zeka & Veri", "Algoritma & Mantık",
        "Siber Güvenlik", "Proje Yönetimi",
    ],
    "makine": [
        "CAD & Tasarım", "Dinamik & Mekanik", "Malzeme Bilimi",
        "Termodinamik", "Üretim & İmalat", "CNC & Otomasyon",
        "Kalite Kontrol", "Proje Yönetimi",
    ],
    "insaat": [
        "Statik & Betonarme", "CAD & Çizim", "Zemin Mekaniği",
        "Yapı Malzemeleri", "Proje Yönetimi", "İş Sağlığı & Güvenliği",
        "Harita & Coğrafya", "Çevre & Sürdürülebilirlik",
    ],
    "elektrik": [
        "Devre Teorisi", "Güç Sistemleri", "Elektronik Tasarım",
        "Mikrodenetleyiciler", "Otomasyon & PLC", "Sinyal İşleme",
        "Yenilenebilir Enerji", "Proje Yönetimi",
    ],
    "endustri": [
        "Süreç Optimizasyonu", "Kalite Yönetimi", "Lojistik & Tedarik",
        "İstatistik & Veri Analizi", "Simülasyon", "Ergonomi",
        "Proje Yönetimi", "ERP Sistemleri",
    ],
    "gida": [
        "Gıda Kimyası", "Mikrobiyoloji", "Gıda İşleme Teknolojisi",
        "Kalite & HACCP", "Paketleme", "Gıda Mevzuatı",
        "Ar-Ge & İnovasyon", "Analitik Kimya",
    ],
    "gemi": [
        "Gemi Tasarımı", "Yapısal Analiz", "Makine Sistemleri",
        "Hidrodinamik", "CAD & 3D Modelleme", "Deniz Hukuku & Mevzuat",
        "Bakım & Onarım", "Proje Yönetimi",
    ],
    "mimarlik": [
        "Mimari Tasarım", "AutoCAD & Revit", "Kentsel Planlama",
        "Yapı Malzemeleri", "İç Mimari", "Adobe & Görsel Sunum",
        "Sürdürülebilir Mimari", "Restorasyon",
    ],
    "isletme": [
        "Muhasebe & Finans", "Pazarlama", "Girişimcilik",
        "İnsan Kaynakları", "Stratejik Yönetim", "Veri Analizi",
        "Dijital Pazarlama", "Proje Yönetimi",
    ],
    "psikoloji": [
        "Klinik Psikoloji", "Araştırma Yöntemleri", "Nörobilim",
        "Gelişim Psikolojisi", "Endüstriyel Psikoloji",
        "Veri Analizi & SPSS", "Danışmanlık Becerileri", "Raporlama",
    ],
    "sosyoloji": [
        "Sosyal Araştırma", "İstatistik & Analiz", "Sosyal Politika",
        "Kültürel Çalışmalar", "Kent Sosyolojisi", "Proje Tasarımı",
        "İletişim Becerileri", "Raporlama & Yazarlık",
    ],
}

# ── Bölüme göre hedef roller ─────────────────────────────────────
BOLUM_ROL_MAP: dict[str, dict[str, list[str]]] = {
    "bilgisayar": {
        "Backend Geliştirici":  ["Python", "FastAPI", "SQL", "Git", "Docker"],
        "Frontend Geliştirici": ["React", "JavaScript", "CSS", "HTML", "TypeScript"],
        "Veri Bilimci":         ["Python", "Pandas", "SQL", "Makine Öğrenmesi", "Veri Görselleştirme"],
        "Siber Güvenlik":       ["Ağ Güvenliği", "Linux", "Penetrasyon Testi", "Şifreleme"],
    },
    "makine": {
        "Tasarım Mühendisi":    ["SolidWorks", "AutoCAD", "Katı Model", "FEM Analizi"],
        "Üretim Mühendisi":     ["CNC", "Kalite Kontrol", "Üretim Planlama", "Lean"],
        "Ar-Ge Mühendisi":      ["Malzeme Bilimi", "Prototipleme", "Test & Validasyon"],
    },
    "insaat": {
        "Yapı Mühendisi":       ["SAP2000", "AutoCAD", "Betonarme Hesabı", "Zemin Etüdü"],
        "Proje Yöneticisi":     ["MS Project", "Bütçe Yönetimi", "Sözleşme", "İş Güvenliği"],
        "Altyapı Mühendisi":    ["Hidrolik", "Karayolu", "GIS", "AutoCAD Civil 3D"],
    },
    "elektrik": {
        "Güç Sistemleri":       ["ETAP", "AutoCAD Electrical", "Trafo", "Enerji Analizi"],
        "Elektronik Tasarım":   ["PCB Tasarımı", "MATLAB", "Mikrodenetleyici", "Devre Simülasyonu"],
        "Otomasyon Mühendisi":  ["PLC", "SCADA", "Endüstriyel Ağlar", "Robot Programlama"],
    },
    "endustri": {
        "Süreç Mühendisi":      ["Süreç İyileştirme", "Six Sigma", "Simülasyon", "Değer Akışı"],
        "Tedarik Zinciri":      ["ERP", "Lojistik", "Stok Yönetimi", "Tedarikçi Yönetimi"],
        "Kalite Mühendisi":     ["ISO 9001", "İstatistiksel Proses Kontrol", "FMEA", "Denetim"],
    },
    "gida": {
        "Gıda Teknolojisti":    ["Gıda İşleme", "HACCP", "Ürün Geliştirme", "Duyusal Analiz"],
        "Kalite Güvence":       ["ISO 22000", "Mikrobiyolojik Analiz", "GMP", "Mevzuat"],
        "Ar-Ge Uzmanı":         ["Formülasyon", "Laboratuvar", "Pilot Üretim", "Patent"],
    },
    "gemi": {
        "Gemi İnşaatçısı":     ["Gemi Tasarımı", "Yapısal Analiz", "CAD", "Hidrostatik"],
        "Gemi Makinecisi":     ["Dizel Motor", "Güç Aktarımı", "Bakım", "Deniz Sistemleri"],
        "Deniz Yöneticisi":    ["Deniz Hukuku", "Lojistik", "Liman Operasyonları"],
    },
    "mimarlik": {
        "Mimar":               ["Mimari Tasarım", "Revit", "AutoCAD", "3D Modelleme"],
        "İç Mimar":            ["İç Mimari Tasarım", "SketchUp", "Adobe Suite", "Sunum"],
        "Kent Plancısı":       ["GIS", "Kentsel Dönüşüm", "İmar Planı", "CBS"],
    },
    "isletme": {
        "Pazarlama Uzmanı":    ["Dijital Pazarlama", "SEO/SEM", "Sosyal Medya", "Analitik"],
        "Finans Analisti":     ["Excel", "Finansal Modelleme", "Muhasebe", "Bütçe"],
        "İK Uzmanı":           ["İşe Alım", "Performans Yönetimi", "İş Hukuku", "HRIS"],
    },
    "psikoloji": {
        "Klinik Psikolog":     ["Psikoterapi", "Psikolojik Değerlendirme", "Vaka Yönetimi"],
        "Endüstriyel Psikolog":["İşe Alım Psikolojisi", "Çalışan Refahı", "Koçluk"],
        "Araştırmacı":         ["SPSS", "Nitel Araştırma", "Anket Tasarımı", "Raporlama"],
    },
    "sosyoloji": {
        "Sosyal Araştırmacı":  ["Saha Araştırması", "SPSS", "Nitel Analiz", "Raporlama"],
        "Sosyal Politika":     ["Politika Analizi", "Proje Tasarımı", "AB Fonları", "Veri"],
        "İletişim Uzmanı":     ["İçerik Üretimi", "Sosyal Medya", "Metin Yazarlığı", "PR"],
    },
}

# ── Geriye dönük uyumluluk (bilgisayar varsayılan) ───────────────
RADAR_CATEGORIES = {
    k: [] for k in BOLUM_KATEGORILERI.get("bilgisayar", [])
}

ROLE_SKILL_MAP = {
    rol: beceriler
    for rol, beceriler in BOLUM_ROL_MAP.get("bilgisayar", {}).items()
}

ROLE_LABELS = {
    rol: rol for rol in BOLUM_ROL_MAP.get("bilgisayar", {})
}
