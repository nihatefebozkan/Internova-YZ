# TF-IDF cosine similarity ile takım-öğrenci eşleştirme
from __future__ import annotations


def takim_eslesim(
    aranan_yetkinlikler: list[str],
    adaylar: list[dict],
    top_n: int = 5,
) -> list[dict]:
    """
    aranan_yetkinlikler: takımın aradığı beceriler ["Python", "React", ...]
    adaylar: [{"student_id": 1, "beceriler": ["Python", "SQL", ...]}, ...]
    Returns: [{"student_id": 1, "score": 0.87, "eslesen_beceriler": [...]}, ...]
    """
    if not aranan_yetkinlikler or not adaylar:
        return []

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        aranan_str = " ".join(aranan_yetkinlikler).lower()
        corpus = [aranan_str]
        for a in adaylar:
            beceriler = a.get("beceriler") or []
            corpus.append(" ".join(beceriler).lower())

        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform(corpus)
        scores = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()

        results = []
        for idx, score in enumerate(scores):
            aday_becerileri = set(b.lower() for b in (adaylar[idx].get("beceriler") or []))
            aranan_set = set(b.lower() for b in aranan_yetkinlikler)
            eslesen = list(aday_becerileri & aranan_set)
            results.append({
                "student_id": adaylar[idx]["student_id"],
                "score": round(float(score), 3),
                "eslesen_beceriler": eslesen,
            })

        return sorted(results, key=lambda x: x["score"], reverse=True)[:top_n]

    except ImportError:
        # scikit-learn yoksa basit jaccard skoru
        aranan_set = set(b.lower() for b in aranan_yetkinlikler)
        results = []
        for a in adaylar:
            beceriler = set(b.lower() for b in (a.get("beceriler") or []))
            union = aranan_set | beceriler
            score = len(aranan_set & beceriler) / len(union) if union else 0.0
            results.append({
                "student_id": a["student_id"],
                "score": round(score, 3),
                "eslesen_beceriler": list(aranan_set & beceriler),
            })
        return sorted(results, key=lambda x: x["score"], reverse=True)[:top_n]
