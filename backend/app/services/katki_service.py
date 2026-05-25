"""GitHub repo'da bir kullanıcının katkısını analiz eder.

Çıktı:
{
  "github_username": "ali",
  "kullanici_var_mi": True,
  "kullanici_commit": 47,
  "toplam_commit": 120,
  "katki_yuzdesi": 39.2,
  "toplam_katkici": 5,
  "calisma_tipi": "takim",          # solo | takim
  "rol_kategorisi": "backend-agirlikli",  # frontend-agirlikli | backend-agirlikli | fullstack | devops | dokuman | karisik
  "dokunulan_dizinler": {"backend": 18, "frontend": 4, "docs": 2},
  "ornek_dosyalar": ["backend/app/main.py", "backend/app/models.py", ...],
  "hata": None
}
"""
import os
import asyncio
import httpx
from typing import Optional
from collections import Counter

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_API = "https://api.github.com"

# Dosya yolundan kategori tespiti — basit prefix/keyword tablosu
KATEGORI_KURALI = [
    ("frontend",   ["frontend/", "client/", "web/", "ui/", "src/components", "pages/", ".jsx", ".tsx", ".vue", ".css", ".scss"]),
    ("backend",    ["backend/", "server/", "api/", "app/routers", "app/services", "app/models", "controllers/", "routes/", ".py", ".go", ".java", ".rs"]),
    ("database",   ["migrations/", "alembic/", "schema.sql", "schema.prisma", "models.py", ".sql"]),
    ("devops",     [".github/", "docker", "Dockerfile", "k8s/", "kubernetes/", "terraform/", "ansible/", ".yml", ".yaml", "ci.", "deploy"]),
    ("test",       ["tests/", "test/", "spec/", ".test.", ".spec.", "__tests__/"]),
    ("dokuman",    ["README", "docs/", ".md", "LICENSE", "CHANGELOG"]),
    ("config",     [".env", ".gitignore", "package.json", "requirements.txt", "pyproject.toml", "tsconfig.json"]),
]


def _headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def _kategori_belirle(path: str) -> Optional[str]:
    p = path.lower()
    for kat, keywords in KATEGORI_KURALI:
        for kw in keywords:
            if kw in p:
                return kat
    return None


def _rol_kategorisi(dizin_sayilari: dict[str, int]) -> str:
    if not dizin_sayilari:
        return "bilinmiyor"
    toplam = sum(dizin_sayilari.values())
    front = dizin_sayilari.get("frontend", 0)
    back  = dizin_sayilari.get("backend", 0) + dizin_sayilari.get("database", 0)
    devops = dizin_sayilari.get("devops", 0)
    docs   = dizin_sayilari.get("dokuman", 0)

    # baskın kategori belirleme — %50 eşiği
    def yuzde(x): return (x / toplam) * 100 if toplam else 0

    if yuzde(front) >= 60:
        return "frontend-agirlikli"
    if yuzde(back) >= 60:
        return "backend-agirlikli"
    if yuzde(devops) >= 50:
        return "devops"
    if yuzde(docs) >= 70:
        return "dokuman"
    if front >= toplam * 0.25 and back >= toplam * 0.25:
        return "fullstack"
    return "karisik"


async def _katkicilar(client: httpx.AsyncClient, owner: str, repo: str) -> list[dict]:
    """GET /repos/{o}/{r}/contributors → [{login, contributions, ...}]"""
    r = await client.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/contributors",
        headers=_headers(),
        params={"per_page": 100, "anon": "false"},
    )
    if r.status_code != 200:
        return []
    return r.json() or []


async def _user_commit_shalari(client: httpx.AsyncClient, owner: str, repo: str, username: str, limit: int = 30) -> list[str]:
    """Kullanıcının son commit SHA'larını çek (en fazla `limit` tane)."""
    r = await client.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/commits",
        headers=_headers(),
        params={"author": username, "per_page": min(limit, 100)},
    )
    if r.status_code != 200:
        return []
    return [c.get("sha") for c in r.json() if c.get("sha")]


async def _commit_dosyalari(client: httpx.AsyncClient, owner: str, repo: str, sha: str) -> list[str]:
    """Bir commit'te değiştirilen dosyaların yollarını döner."""
    r = await client.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}",
        headers=_headers(),
    )
    if r.status_code != 200:
        return []
    d = r.json()
    return [f.get("filename", "") for f in d.get("files", []) if f.get("filename")]


async def katki_analizi(owner: str, repo: str, github_username: Optional[str]) -> dict:
    """Tüm akış. github_username None ise sadece toplam istatistik döner."""
    bos = {
        "github_username":     github_username,
        "kullanici_var_mi":    False,
        "kullanici_commit":    0,
        "toplam_commit":       0,
        "katki_yuzdesi":       0.0,
        "toplam_katkici":      0,
        "calisma_tipi":        "bilinmiyor",
        "rol_kategorisi":      "bilinmiyor",
        "dokunulan_dizinler":  {},
        "ornek_dosyalar":      [],
        "hata":                None,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            contribs = await _katkicilar(client, owner, repo)
            if not contribs:
                bos["hata"] = "Katkıcı listesi alınamadı"
                return bos

            toplam_commit = sum(c.get("contributions", 0) for c in contribs)
            toplam_katkici = len(contribs)
            calisma = "solo" if toplam_katkici <= 1 else "takim"

            bos.update({
                "toplam_commit":  toplam_commit,
                "toplam_katkici": toplam_katkici,
                "calisma_tipi":   calisma,
            })

            if not github_username:
                return bos

            uname_low = github_username.lower()
            user_contrib = next((c for c in contribs if (c.get("login") or "").lower() == uname_low), None)

            if not user_contrib:
                bos["kullanici_var_mi"] = False
                return bos

            user_commit = user_contrib.get("contributions", 0)
            yuzde = round((user_commit / toplam_commit) * 100, 1) if toplam_commit else 0.0

            # Dosya kategorilerini çıkar — son 30 commit
            shalar = await _user_commit_shalari(client, owner, repo, github_username, limit=30)
            dosya_listesi = []
            if shalar:
                gruplar = await asyncio.gather(*[_commit_dosyalari(client, owner, repo, s) for s in shalar])
                for grup in gruplar:
                    dosya_listesi.extend(grup)

            # Kategori sayıları
            kat_sayac = Counter()
            for d in dosya_listesi:
                k = _kategori_belirle(d)
                if k:
                    kat_sayac[k] += 1

            # En çok dokunulan benzersiz dosyalar
            benzersiz = Counter(dosya_listesi)
            ornek = [path for path, _ in benzersiz.most_common(8)]

            bos.update({
                "kullanici_var_mi":   True,
                "kullanici_commit":   user_commit,
                "katki_yuzdesi":      yuzde,
                "rol_kategorisi":     _rol_kategorisi(dict(kat_sayac)),
                "dokunulan_dizinler": dict(kat_sayac),
                "ornek_dosyalar":     ornek,
            })
            return bos
    except Exception as e:
        bos["hata"] = f"Katkı analizi hatası: {e}"
        return bos
