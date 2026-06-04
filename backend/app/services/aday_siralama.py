"""Bir ilana yapılan başvuruları, başvuranın profili ile ilanın beceri profili
karşılaştırılarak uyum yüzdesine göre sıralar.

Mevcut `eksik_analizi` servisinin helper'larını yeniden kullanır — LLM gerekmez,
hızlı deterministik skor.
"""
from sqlalchemy.orm import Session

from app.models import Application, Internship, User
from app.services.eksik_analizi import _kategori_skor, _kullanici_beceri_havuzu


def _uyum_yuzdesi(havuz: list[str], beceri_profili: dict) -> tuple[int, str | None, str | None]:
    """0-100 uyum + en güçlü/en zayıf kategori adı."""
    if not beceri_profili:
        return 0, None, None

    kategori_skorlar = {}
    for kategori, hedef in beceri_profili.items():
        try:
            hedef = int(hedef)
        except (TypeError, ValueError):
            continue
        if hedef <= 0:
            continue
        mevcut = _kategori_skor(havuz, kategori)
        kategori_skorlar[kategori] = (mevcut, hedef)

    if not kategori_skorlar:
        return 0, None, None

    toplam_hedef = sum(h for _, h in kategori_skorlar.values()) or 1
    toplam_mevcut = sum(min(m, h) for m, h in kategori_skorlar.values())
    yuzde = round(toplam_mevcut / toplam_hedef * 100)

    # En güçlü/en zayıf: ratio mevcut/hedef
    ratios = {k: (m / h if h else 0) for k, (m, h) in kategori_skorlar.items()}
    en_guclu = max(ratios.items(), key=lambda x: x[1])[0]
    en_zayif = min(ratios.items(), key=lambda x: x[1])[0]
    return yuzde, en_guclu, en_zayif


def adaylari_sirala(db: Session, internship: Internship, basvurular: list[Application]) -> list[dict]:
    """İlanın başvuranlarını AI uyum skoruna göre sıralı liste döner."""
    sonuc = []
    bp = internship.beceri_profili or {}

    for a in basvurular:
        ogr: User | None = a.student
        if not ogr:
            continue
        havuz = _kullanici_beceri_havuzu(db, ogr.id)
        yuzde, en_guclu, en_zayif = _uyum_yuzdesi(havuz, bp)
        sonuc.append({
            "application_id":     a.id,
            "student_id":         ogr.id,
            "ad_soyad":           f"{ogr.ad} {ogr.soyad}".strip(),
            "bolum":              ogr.bolum,
            "durum":              a.durum,
            "uyum_yuzdesi":       yuzde,
            "en_guclu_kategori":  en_guclu,
            "en_zayif_kategori":  en_zayif,
            "basvuru_tarihi":     a.basvuru_tarihi,
        })

    sonuc.sort(key=lambda x: x["uyum_yuzdesi"], reverse=True)
    return sonuc
