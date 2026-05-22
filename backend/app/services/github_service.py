# GitHub repo analizi — REST API v3 + Gemini LLM
# Klonlama yok: sadece gerekli dosyalar çekilir
import os
import re
import base64
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "").strip()

# GitHub'da analiz edilecek bağımlılık / konfigürasyon dosyaları
HEDEF_DOSYALAR = [
    "requirements.txt", "requirements-dev.txt",
    "package.json", "package-lock.json",
    "Pipfile", "pyproject.toml", "setup.py", "setup.cfg",
    "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "composer.json", "Gemfile",
    "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
    ".gitignore", "README.md",
]

MAX_DOSYA_BOYUTU = 50_000   # 50 KB üstü dosyaları atla
GITHUB_API      = "https://api.github.com"


# ─────────────────────────────────────────────────────────────────
# URL parse
# ─────────────────────────────────────────────────────────────────

def github_url_parse(url: str) -> tuple[str, str]:
    """
    'https://github.com/owner/repo' → ('owner', 'repo')
    Geçersizse ValueError fırlatır.
    """
    url = url.strip().rstrip("/")
    m = re.match(
        r"https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)",
        url,
    )
    if not m:
        raise ValueError("Geçerli bir GitHub repo URL'si girin (örn: https://github.com/kullanici/repo)")
    return m.group(1), m.group(2)


# ─────────────────────────────────────────────────────────────────
# HTTP yardımcısı
# ─────────────────────────────────────────────────────────────────

def _headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def _rate_limit_kontrol(response: httpx.Response) -> None:
    if response.status_code == 403:
        kalan = response.headers.get("x-ratelimit-remaining", "?")
        if kalan == "0":
            import time
            reset = int(response.headers.get("x-ratelimit-reset", 0))
            bekleme = max(reset - int(time.time()), 0)
            raise RuntimeError(
                f"GitHub API rate limit aşıldı. {bekleme} saniye sonra tekrar dene. "
                "Hızlandırmak için .env dosyasına GITHUB_TOKEN ekle."
            )
        raise RuntimeError("GitHub API erişim reddedildi (403)")
    if response.status_code == 404:
        raise ValueError("Repo bulunamadı. URL'i ve repo'nun public olduğunu kontrol et.")
    if response.status_code == 422:
        raise ValueError("Geçersiz repo URL'si")
    response.raise_for_status()


# ─────────────────────────────────────────────────────────────────
# Veri çekme
# ─────────────────────────────────────────────────────────────────

def proje_buyuklugu_hesapla(repo_bilgi: dict) -> int:
    """
    Repo büyüklüğünü 0-100 arası normalize eder.
    Faktörler: boyut (KB), yıldız, fork.

    Referans:
      - Büyük proje  (> 5000 KB, > 50 star) → 70-100
      - Orta proje   (500-5000 KB, 5-50 star) → 30-70
      - Küçük proje  (< 500 KB, < 5 star)    → 0-30
    """
    size_kb = repo_bilgi.get("size_kb", 0)
    stars   = repo_bilgi.get("yildiz", 0)
    forks   = repo_bilgi.get("fork", 0)

    # Her faktör max 100'e normalize edilip ağırlıklandırılır
    size_skor  = min(size_kb / 5000 * 100, 100)  # 5000 KB = tam puan
    star_skor  = min(stars   / 100  * 100, 100)  # 100 star = tam puan
    fork_skor  = min(forks   / 30   * 100, 100)  # 30 fork = tam puan

    # Ağırlıklar: boyut %60, star %30, fork %10
    skor = size_skor * 0.60 + star_skor * 0.30 + fork_skor * 0.10
    return max(5, min(100, round(skor)))  # minimum 5 (sıfır olmasın)


async def repo_bilgi_al(owner: str, repo: str) -> dict:
    """Repo meta bilgisi: dil, açıklama, yıldız sayısı."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}", headers=_headers())
        _rate_limit_kontrol(r)
        d = r.json()
        def temiz(s):
            return (s or "").encode("ascii", errors="ignore").decode("ascii")
        return {
            "ad":       temiz(d.get("name", "")),
            "aciklama": temiz(d.get("description", "")),
            "dil":      temiz(d.get("language", "")),
            "yildiz":   d.get("stargazers_count", 0),
            "fork":     d.get("forks_count", 0),
            "size_kb":  d.get("size", 0),
        }


async def kok_dizin_al(owner: str, repo: str) -> list[str]:
    """Repo kök dizinindeki dosya/klasör adları."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/",
            headers=_headers(),
        )
        _rate_limit_kontrol(r)
        return [item["name"] for item in r.json() if isinstance(r.json(), list)]


async def dosya_icerik_al(owner: str, repo: str, yol: str) -> Optional[str]:
    """Belirtilen dosyanın içeriğini Base64'ten decode ederek döner."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{yol}",
            headers=_headers(),
        )
        if r.status_code == 404:
            return None
        _rate_limit_kontrol(r)
        d = r.json()
        if d.get("size", 0) > MAX_DOSYA_BOYUTU:
            return f"[{yol} cok buyuk, atlandi]"
        icerik = d.get("content", "")
        if icerik:
            metin = base64.b64decode(icerik).decode("utf-8", errors="replace")
            # ASCII dışı karakterleri kaldır — LLM API uyumluluğu için
            return metin.encode("ascii", errors="ignore").decode("ascii")
        return None


async def bagimlilik_dosyalari_topla(owner: str, repo: str, mevcut_dosyalar: list[str]) -> dict[str, str]:
    """
    Kök dizinde bulunan hedef dosyaları paralel olarak çeker.
    Returns: {dosya_adi: icerik}
    """
    import asyncio
    hedefler = [d for d in HEDEF_DOSYALAR if d in mevcut_dosyalar]

    async def cek(dosya):
        try:
            icerik = await dosya_icerik_al(owner, repo, dosya)
            return dosya, icerik
        except Exception:
            return dosya, None

    sonuclar = await asyncio.gather(*[cek(d) for d in hedefler])
    return {k: v for k, v in sonuclar if v}


# ─────────────────────────────────────────────────────────────────
# LLM analiz
# ─────────────────────────────────────────────────────────────────

def _llm_prompt_olustur(repo_bilgi: dict, kok_dizin: list[str], dosyalar: dict[str, str]) -> str:
    dizin_listesi = "\n".join(f"- {d}" for d in kok_dizin[:50])
    dosya_icerik  = ""
    for ad, icerik in dosyalar.items():
        kisaltilmis = icerik[:2000] if icerik else ""
        dosya_icerik += f"\n\n### {ad}\n```\n{kisaltilmis}\n```"

    return f"""Analyze this GitHub repository and return ONLY valid JSON, no other text.

Repo: {repo_bilgi['ad']}
Description: {repo_bilgi['aciklama']}
Primary Language: {repo_bilgi['dil']}
Size: {repo_bilgi.get('size_kb', 0)} KB

Root files/folders: {', '.join(kok_dizin[:30])}
{dosya_icerik[:3000]}

Return this exact JSON structure:

{{
  "teknolojiler": ["Python", "Pandas"],
  "konu": "veri analizi",
  "teknoloji_skoru": 70,
  "konu_skoru": 80,
  "buyukluk_skoru": 45,
  "ozet": "one sentence summary"
}}

Rules:
- teknolojiler: list of technologies/libraries used
- konu: project subject in Turkish (2-4 words, e.g. "web gelistirme", "veri analizi", "makine ogrenmesi")
- teknoloji_skoru: 0-100, how advanced and diverse the tech stack is
- konu_skoru: 0-100, how technically deep and focused the subject matter is
- buyukluk_skoru: 0-100, estimated project size/complexity based on:
    * number of files/folders in root
    * number and variety of dependencies
    * whether it has multiple modules/packages (bigger) or is a single script (smaller)
    * overall scope (personal experiment=10-30, medium project=30-60, production system=60-100)
- ONLY return the JSON, nothing else"""


OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GROQ_KEY   = os.getenv("GROQ_API_KEY", "").strip()
_BOSH = {"teknolojiler": [], "ozet": "", "llm_basarili": False, "llm_hatasi": None}


async def _gemini_analiz(prompt: str) -> dict:
    """Gemini ile analiz, 503'te 2 kez retry."""
    if not GEMINI_KEY:
        return None
    import asyncio, json
    from google import genai
    for deneme in range(3):
        try:
            client = genai.Client(api_key=GEMINI_KEY)
            r = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
            m = re.search(r'\{[\s\S]*\}', r.text.strip())
            if m:
                veri = json.loads(m.group(0))
                veri["llm_basarili"] = True
                return veri
        except Exception as e:
            if "503" in str(e) and deneme < 2:
                await asyncio.sleep(3 * (deneme + 1))
                continue
            return None
    return None


async def _groq_analiz(prompt: str) -> dict:
    """Groq (llama-3.3-70b) ile analiz — ücretsiz, hızlı."""
    if not GROQ_KEY:
        return None
    import json
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_KEY)
        r = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        metin = r.choices[0].message.content.strip()
        m = re.search(r'\{[\s\S]*\}', metin)
        if m:
            veri = json.loads(m.group(0))
            veri["llm_basarili"] = True
            return veri
    except Exception:
        return None
    return None


async def _openai_analiz(prompt: str) -> dict:
    """OpenAI GPT-4o-mini ile analiz."""
    if not OPENAI_KEY:
        return None
    import json
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_KEY)
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        metin = r.choices[0].message.content.strip()
        m = re.search(r'\{[\s\S]*\}', metin)
        if m:
            veri = json.loads(m.group(0))
            veri["llm_basarili"] = True
            return veri
    except Exception:
        return None
    return None


async def llm_analiz_et(prompt: str) -> dict:
    """
    Gemini → Groq → OpenAI → hata.
    Fallback hesaplama YOK.
    """
    sonuc = await _gemini_analiz(prompt)
    if sonuc:
        return sonuc

    sonuc = await _groq_analiz(prompt)
    if sonuc:
        return sonuc

    sonuc = await _openai_analiz(prompt)
    if sonuc:
        return sonuc

    return {**_BOSH, "llm_hatasi": "Gemini, Groq ve OpenAI API'leri başarısız oldu"}


# ─────────────────────────────────────────────────────────────────
# Ana fonksiyon
# ─────────────────────────────────────────────────────────────────

async def github_repo_analiz_et(github_url: str) -> dict:
    """
    GitHub URL'sinden tam analiz yapar.
    Returns: {
        proje_adi, github_url, aciklama, teknolojiler,
        kategoriler, ozet, repo_bilgi, hata
    }
    """
    try:
        owner, repo = github_url_parse(github_url)

        # Paralel: repo bilgisi + kök dizin
        import asyncio
        repo_bilgi, kok_dizin = await asyncio.gather(
            repo_bilgi_al(owner, repo),
            kok_dizin_al(owner, repo),
        )

        # Bağımlılık dosyalarını çek
        dosyalar = await bagimlilik_dosyalari_topla(owner, repo, kok_dizin)

        # LLM analiz
        prompt  = _llm_prompt_olustur(repo_bilgi, kok_dizin, dosyalar)
        analiz  = await llm_analiz_et(prompt)

        # LLM başarısız olduysa birincil dili fallback teknoloji olarak kullan
        teknolojiler = analiz.get("teknolojiler", [])
        if not teknolojiler and repo_bilgi.get("dil"):
            teknolojiler = [repo_bilgi["dil"]]

        # Açıklama: LLM özeti varsa kullan, yoksa repo açıklaması
        ozet = analiz.get("ozet", "") or repo_bilgi.get("aciklama", "")

        # Her iki API başarısız → hata kaydı döndür
        if analiz.get("llm_hatasi"):
            return {
                "proje_adi":       repo_bilgi["ad"],
                "github_url":      github_url,
                "aciklama":        "",
                "teknolojiler":    [],
                "proje_buyuklugu": 0,
                "konu":            "",
                "teknik_yetkinlik": 0.0,
                "beceriler":       0.0,
                "analiz_durumu":   "api_hatasi",
                "llm_basarili":    False,
                "hata":            analiz["llm_hatasi"],
            }

        teknoloji_skoru = analiz.get("teknoloji_skoru", 50)
        konu_skoru      = analiz.get("konu_skoru", 50)
        konu            = analiz.get("konu", "")

        # Büyüklük: AI tahmini
        buyukluk = max(5, min(100, int(analiz.get("buyukluk_skoru", 50))))

        # teknik_yetkinlik = buyukluk/100 × (teknoloji_skoru×0.40 + konu_skoru×0.60)
        ham_yetkinlik    = teknoloji_skoru * 0.40 + konu_skoru * 0.60
        teknik_yetkinlik = round((buyukluk / 100) * ham_yetkinlik, 2)

        # beceriler = teknik_yetkinlik / 100  (0-1 arası normalize)
        beceriler = round(teknik_yetkinlik / 100, 4)

        return {
            "proje_adi":         repo_bilgi["ad"],
            "github_url":        github_url,
            "aciklama":          ozet,
            "teknolojiler":      teknolojiler,
            "proje_buyuklugu":   buyukluk,
            "konu":              konu,
            "teknik_yetkinlik":  teknik_yetkinlik,
            "beceriler":         beceriler,
            # debug için
            "teknoloji_skoru":   teknoloji_skoru,
            "konu_skoru":        konu_skoru,
            "ozet":              ozet,
            "repo_bilgi":        repo_bilgi,
            "analiz_durumu":     "basarili",
            "llm_basarili":      True,
            "hata":              None,
        }

    except ValueError as e:
        return {"proje_adi":"","github_url":github_url,"aciklama":"",
                "teknolojiler":[],"kategoriler":{},"ozet":"","repo_bilgi":{},"hata":str(e)}
    except RuntimeError as e:
        return {"proje_adi":"","github_url":github_url,"aciklama":"",
                "teknolojiler":[],"kategoriler":{},"ozet":"","repo_bilgi":{},"hata":str(e)}
    except Exception as e:
        return {"proje_adi":"","github_url":github_url,"aciklama":"",
                "teknolojiler":[],"kategoriler":{},"ozet":"","repo_bilgi":{},"hata":f"Beklenmeyen hata: {e}"}
