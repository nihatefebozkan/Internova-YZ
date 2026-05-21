# Kariyer haritası için statik veri: rol-beceri matrisi ve kategori eşleştirmeleri

ROLE_SKILL_MAP: dict[str, list[str]] = {
    "backend": ["Python", "FastAPI", "Django", "SQL", "PostgreSQL", "Redis", "Docker", "Git", "REST API", "Linux"],
    "frontend": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Vue.js", "Redux", "Webpack", "Figma"],
    "data": ["Python", "Pandas", "NumPy", "SQL", "Makine Öğrenmesi", "TensorFlow", "Veri Görselleştirme", "Tableau", "Excel"],
    "embedded": ["C", "C++", "Gömülü Sistemler", "Arduino", "FPGA", "Devre Tasarımı", "RTOS", "Mikrodenetleyici"],
    "management": ["Proje Yönetimi", "Scrum", "Agile", "Jira", "İletişim", "Takım Liderliği", "MS Office"],
}

# 8 radar kategorisi → içinde hangi beceriler var
RADAR_CATEGORIES: dict[str, list[str]] = {
    "Yazılım Dilleri": ["Python", "JavaScript", "TypeScript", "Java", "C", "C++", "Go", "Rust"],
    "Web Teknolojileri": ["React", "Vue.js", "FastAPI", "Django", "Node.js", "HTML", "CSS", "REST API"],
    "Veritabanı": ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLAlchemy"],
    "DevOps & Araçlar": ["Docker", "Git", "Linux", "CI/CD", "Kubernetes", "GitHub Actions"],
    "Veri & YZ": ["Pandas", "NumPy", "Makine Öğrenmesi", "TensorFlow", "Veri Görselleştirme", "Tableau"],
    "Gömülü & Donanım": ["C", "C++", "Gömülü Sistemler", "Arduino", "FPGA", "Devre Tasarımı"],
    "Yabancı Dil": ["İngilizce", "Almanca", "Fransızca", "İspanyolca"],
    "Yönetim & İletişim": ["Proje Yönetimi", "Scrum", "Agile", "Takım Liderliği", "İletişim", "MS Office"],
}

ROLE_LABELS: dict[str, str] = {
    "backend": "Backend Geliştirici",
    "frontend": "Frontend Geliştirici",
    "data": "Veri Bilimci",
    "embedded": "Gömülü Sistemler",
    "management": "Proje Yöneticisi",
}
