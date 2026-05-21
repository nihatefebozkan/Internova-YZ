# Gemini API ile Türkçe metin dönüştürme servisi (google-genai)
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

DIARY_SYSTEM_PROMPT = """Sen BTÜ staj defteri yazım asistanısın.
Öğrencinin yazdığı günlük ham metni akademik Türkçeye dönüştür.
Kurallar:
- Teknik terimleri koru, Türkçe karşılıkları varsa kullan
- Kişisel anlatımı ("ben yaptım", "gittim") üçüncü şahsa çevir ("stajyer gerçekleştirdi")
- Edilgen yapı ve akademik bağlaçlar kullan
- Orijinal içeriği koru, yorum ekleme
- Uzunluğu yaklaşık 1.5x-2x artır, detay ekle
Sadece dönüştürülmüş metni döndür, açıklama yapma."""


def _get_client():
    from google import genai
    return genai.Client(api_key=GEMINI_API_KEY)


def ham_metni_akademik_yap(ham_metin: str) -> str:
    if not GEMINI_API_KEY:
        return (
            "[GEMINI_API_KEY eksik — .env dosyasına GEMINI_API_KEY=... ekleyin]\n\n"
            f"Ham metin (dönüştürülmedi): {ham_metin}"
        )
    try:
        client = _get_client()
        response = client.models.generate_content(
            model="models/gemini-2.5-flash-lite",
            contents=f"{DIARY_SYSTEM_PROMPT}\n\nHam metin:\n{ham_metin}",
        )
        return response.text.strip()
    except Exception as e:
        raise RuntimeError(f"LLM hatası: {e}")


def cv_iyilestir(cv_ozeti: str) -> str:
    if not GEMINI_API_KEY:
        return "[GEMINI_API_KEY eksik]"
    try:
        client = _get_client()
        prompt = (
            "Sen bir kariyer danışmanısın. Aşağıdaki CV özetini analiz et, "
            "güçlü yanları ve geliştirilebilecek alanları belirt, 3 somut öneri sun. "
            "Türkçe yanıt ver.\n\nCV Özeti:\n" + cv_ozeti
        )
        return client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt).text.strip()
    except Exception as e:
        raise RuntimeError(f"LLM hatası: {e}")


def ilan_iyilestir(ilan_aciklama: str) -> str:
    if not GEMINI_API_KEY:
        return "[GEMINI_API_KEY eksik]"
    try:
        client = _get_client()
        prompt = (
            "Sen bir İK uzmanısın. Aşağıdaki staj ilanı açıklamasını analiz et, "
            "yetenekli adayları çekecek şekilde iyileştirme önerileri sun. "
            "Türkçe yanıt ver.\n\nİlan:\n" + ilan_aciklama
        )
        return client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt).text.strip()
    except Exception as e:
        raise RuntimeError(f"LLM hatası: {e}")
