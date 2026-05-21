# BTK Akademi sertifika doğrulama — Playwright ile
import re

BTK_URL = "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId={cert_no}"


def _eslesme(a: str, b: str) -> bool:
    """Metin veya tarih karşılaştırır."""
    a, b = a.strip(), b.strip()
    if not a or not b:
        return False

    # Tarih formatı (GG.AA.YYYY) → doğrudan karşılaştır
    if re.match(r'\d{2}\.\d{2}\.\d{4}', a):
        return a == b

    # Metin → token bazlı karşılaştırma
    def norm(s):
        s = s.lower().translate(str.maketrans("ığşçöüı", "igscouı"))
        return set(re.findall(r'[a-z]{2,}', s))

    ta, tb = norm(a), norm(b)
    if not ta or not tb:
        return False
    return len(ta & tb) / max(len(ta), len(tb)) >= 0.60


async def btk_dogrula(cert_no: str, pdf_isim: str, pdf_kurs: str, pdf_tarih: str) -> dict:
    """
    BTK sitesine gider, PDF'i indirir, 3 kriteri karşılaştırır.
    Returns: {basarili, bulunamadi, eslesme, btk_veri, hata}
    """
    try:
        from playwright.async_api import async_playwright
        import fitz

        pdf_bytes    = None
        pdf_resp_obj = None

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0",
                locale="tr-TR",
            )
            page = await context.new_page()

            async def on_response(resp):
                nonlocal pdf_resp_obj
                if "certificate-pdf" in resp.url and resp.status == 200:
                    pdf_resp_obj = resp

            page.on("response", on_response)

            await page.goto(
                BTK_URL.format(cert_no=cert_no.strip()),
                wait_until="domcontentloaded",
                timeout=30_000,
            )
            await page.wait_for_timeout(8000)

            if pdf_resp_obj:
                try:
                    pdf_bytes = await pdf_resp_obj.body()
                except Exception:
                    pdf_bytes = None

            sayfa_metin = await page.inner_text("body")
            await browser.close()

        # URL bulunamadı mı?
        sayfa_lower = sayfa_metin.lower()
        if any(k in sayfa_lower for k in ["sertifika hatası", "bulunamadı", "geçerli değil"]):
            return _bulunamadi(f"Sertifika bulunamadı (ID: {cert_no})")

        if not pdf_bytes:
            return _bulunamadi("BTK sayfasından PDF alınamadı")

        # PDF metin katmanından BTK verilerini çek
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        btk_metin = doc[0].get_text("text").strip()

        from app.services.ocr_service import _parse_isim, _parse_kurs, _parse_tarih
        btk_isim  = _parse_isim(btk_metin)
        btk_kurs  = _parse_kurs(btk_metin)
        btk_tarih = _parse_tarih(btk_metin)

        # 3 kriter — hepsi uyuşmalı
        e_isim  = _eslesme(btk_isim,  pdf_isim)
        e_kurs  = _eslesme(btk_kurs,  pdf_kurs)
        e_tarih = _eslesme(btk_tarih, pdf_tarih)

        return {
            "basarili":   e_isim and e_kurs and e_tarih,
            "bulunamadi": False,
            "eslesme":    {"isim": e_isim, "kurs": e_kurs, "tarih": e_tarih},
            "btk_veri":   {"isim": btk_isim, "kurs": btk_kurs, "tarih": btk_tarih},
            "hata":       None,
        }

    except Exception as e:
        return _bulunamadi(f"Bağlantı hatası: {e}")


def _bulunamadi(mesaj: str) -> dict:
    return {
        "basarili":   False,
        "bulunamadi": True,
        "eslesme":    {"isim": False, "kurs": False, "tarih": False},
        "btk_veri":   {"isim": "", "kurs": "", "tarih": ""},
        "hata":       mesaj,
    }
