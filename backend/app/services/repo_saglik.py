"""GitHub repo sağlık & aktiflik kontrolü.

Çıktı:
{
  "son_commit_tarih": "2026-04-12T14:32:00Z",
  "son_commit_gun": 42,              # bugünden kaç gün önce
  "aktif_mi": True,                  # son commit < 180 gün
  "default_branch": "main",
  "acik_issue": 3,
  "acik_pr": 1,
  "readme_var": True,
  "readme_uzunluk": 1240,
  "license_adi": "MIT License",
  "license_var": True,
  "changelog_var": False,
  "test_klasoru_var": False,
  "ci_var": True,
  "docker_var": True,
  "stars": 5,
  "forks": 1,
  "size_kb": 1528,
  "topics": ["machine-learning","python"]
}
"""
import os
import httpx
from datetime import datetime, timezone

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_API = "https://api.github.com"


def _headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


async def repo_saglik_al(owner: str, repo: str, kok_dizin: list[str] | None = None) -> dict:
    """Repo meta + kök dizin ipuçlarından sağlık raporu üretir."""
    bos = {
        "son_commit_tarih": None, "son_commit_gun": None, "aktif_mi": False,
        "default_branch": None, "acik_issue": 0, "acik_pr": 0,
        "readme_var": False, "readme_uzunluk": 0,
        "license_adi": None, "license_var": False,
        "changelog_var": False, "test_klasoru_var": False,
        "ci_var": False, "docker_var": False,
        "stars": 0, "forks": 0, "size_kb": 0, "topics": [],
        "hata": None,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}", headers=_headers())
            if r.status_code != 200:
                bos["hata"] = f"Repo meta alınamadı (HTTP {r.status_code})"
                return bos
            d = r.json()

            # Son commit
            pushed = d.get("pushed_at")
            if pushed:
                try:
                    son = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
                    gun = (datetime.now(timezone.utc) - son).days
                    bos["son_commit_tarih"] = pushed
                    bos["son_commit_gun"] = gun
                    bos["aktif_mi"] = gun < 180
                except Exception:
                    pass

            bos["default_branch"] = d.get("default_branch")
            bos["acik_issue"]     = d.get("open_issues_count", 0)
            bos["stars"]          = d.get("stargazers_count", 0)
            bos["forks"]          = d.get("forks_count", 0)
            bos["size_kb"]        = d.get("size", 0)
            bos["topics"]         = d.get("topics", []) or []
            lic                   = d.get("license") or {}
            bos["license_adi"]    = lic.get("name") if lic else None
            bos["license_var"]    = bool(lic)

            # Açık PR'lar — issues sayısı PR'ları da içerir, ayır:
            try:
                rpr = await client.get(
                    f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
                    headers=_headers(),
                    params={"state": "open", "per_page": 1},
                )
                # Link header'dan total pages'i çek
                link = rpr.headers.get("link", "")
                if 'rel="last"' in link:
                    import re as _re
                    m = _re.search(r'page=(\d+)>; rel="last"', link)
                    if m:
                        bos["acik_pr"] = int(m.group(1))
                else:
                    bos["acik_pr"] = len(rpr.json()) if rpr.status_code == 200 else 0
                # acik_issue'dan PR'ları çıkar
                bos["acik_issue"] = max(0, bos["acik_issue"] - bos["acik_pr"])
            except Exception:
                pass

            # README uzunluğu
            try:
                rr = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/readme", headers=_headers())
                if rr.status_code == 200:
                    rd = rr.json()
                    bos["readme_var"] = True
                    bos["readme_uzunluk"] = rd.get("size", 0)
            except Exception:
                pass

            # Kök dizin ipuçlarından bazı flag'leri çıkar
            if kok_dizin:
                low = [k.lower() for k in kok_dizin]
                bos["changelog_var"]    = any("changelog" in k for k in low)
                bos["test_klasoru_var"] = any(k in ("tests", "test", "__tests__", "spec") for k in low)
                bos["docker_var"]       = any(k in ("dockerfile", "docker-compose.yml", "docker-compose.yaml") for k in low)
                bos["ci_var"]           = ".github" in low or any(k in (".gitlab-ci.yml", ".circleci", "azure-pipelines.yml", "jenkinsfile") for k in low)

            return bos
    except Exception as e:
        bos["hata"] = f"Sağlık analizi hatası: {e}"
        return bos
