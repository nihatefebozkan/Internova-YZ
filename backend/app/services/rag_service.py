# BTÜ yönetmeliği üzerinde keyword-match + Gemini RAG
import os
from pathlib import Path

YONETMELIK_YOLU = Path(__file__).parent.parent / "data" / "btu_yonetmelik.txt"
CHUNK_BOYUTU = 500
CHUNK_OVERLAP = 100


def _yukle_ve_bol() -> list[str]:
    try:
        metin = YONETMELIK_YOLU.read_text(encoding="utf-8")
    except FileNotFoundError:
        return []
    chunks = []
    adim = CHUNK_BOYUTU - CHUNK_OVERLAP
    for i in range(0, len(metin), adim):
        chunks.append(metin[i : i + CHUNK_BOYUTU])
    return chunks


def _ilgili_chunk_bul(soru: str, chunks: list[str], top_k: int = 3) -> list[str]:
    kelimeler = set(soru.lower().split())
    skorlar = [len(kelimeler & set(c.lower().split())) for c in chunks]
    sirali = sorted(range(len(skorlar)), key=lambda i: skorlar[i], reverse=True)
    return [chunks[i] for i in sirali[:top_k]]


async def sor(soru: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    chunks = _yukle_ve_bol()

    if not chunks:
        return "BTÜ yönetmeliği dosyası bulunamadı."

    ilgili = _ilgili_chunk_bul(soru, chunks)
    context = "\n---\n".join(ilgili)

    if not api_key:
        return (
            f"[GEMINI_API_KEY eksik — gerçek yanıt için .env dosyasına ekleyin]\n\n"
            f"Soru: {soru}\n\n"
            f"İlgili yönetmelik bölümleri:\n{context[:400]}..."
        )

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = (
            "Sen BTÜ staj koordinatörü asistanısın. "
            "Yalnızca aşağıdaki BTÜ Staj Yönetmeliği bağlamını kullanarak soruyu yanıtla. "
            "Bağlamda yanıt yoksa 'Bu bilgi yönetmelikte yer almıyor' de.\n\n"
            f"BAĞLAM:\n{context}\n\n"
            f"SORU: {soru}"
        )
        response = client.models.generate_content(model="models/gemini-2.5-flash-lite", contents=prompt)
        return response.text.strip()
    except Exception as e:
        return f"Yanıt alınamadı: {e}"
