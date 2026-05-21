# BTK sertifikası PDF'inden veri çıkarma — metin katmanı ile
import re


def btk_pdf_oku(dosya_bytes: bytes) -> dict:
    """
    BTK sertifikası PDF'inin metin katmanını okur.
    Returns: {cert_no, isim, kurs, tarih, hata}
    """
    try:
        import fitz
        doc = fitz.open(stream=dosya_bytes, filetype="pdf")
        if doc.page_count == 0:
            return _hata("PDF boş")

        metin = doc[0].get_text("text").strip()
        if len(metin) < 20:
            return _hata("PDF metin katmanı okunamadı")

        return {
            "cert_no": _parse_cert_no(metin),
            "isim":    _parse_isim(metin),
            "kurs":    _parse_kurs(metin),
            "tarih":   _parse_tarih(metin),
            "hata":    None,
        }
    except Exception as e:
        return _hata(str(e))


def _parse_cert_no(metin: str) -> str:
    m = re.search(r'[Ss]ertifika\s*[Nn]o\s*[:\-]?\s*([A-Za-z0-9]{6,20})', metin)
    return m.group(1).strip() if m else ""


def _parse_isim(metin: str) -> str:
    """KATILIM SERTİFİKASI'nın altındaki büyük harfli isim satırı."""
    DISI = {"KATILIM", "SERTİFİKASI", "BAŞARI", "KURUMU", "AKADEMİ",
            "BİLGİ", "TEKNOLOJİLERİ", "İLETİŞİM", "BTK"}
    for satir in metin.split("\n"):
        satir = satir.strip()
        parcalar = satir.split()
        if (2 <= len(parcalar) <= 4
                and all(re.match(r'^[A-ZÇĞİÖŞÜ]{2,}$', p) for p in parcalar)
                and not any(p in DISI for p in parcalar)):
            return satir
    return ""


def _parse_kurs(metin: str) -> str:
    """İsimdein sonra gelen tırnak içindeki kurs adı."""
    m = re.search(r'[""“”]([^""“”]{5,80})[""“”]', metin)
    return m.group(1).strip() if m else ""


def _parse_tarih(metin: str) -> str:
    """Kurs adından 2 satır sonra gelen tırnak içindeki tarih."""
    m = re.search(r'[""“”](\d{2}\.\d{2}\.\d{4})[""“”]', metin)
    if m:
        return m.group(1)
    m2 = re.search(r'\b(\d{2}\.\d{2}\.\d{4})\b', metin)
    return m2.group(1) if m2 else ""


def _hata(mesaj: str) -> dict:
    return {"cert_no": "", "isim": "", "kurs": "", "tarih": "", "hata": mesaj}
