"""Batch orchestration, independently testable without downloading models.

Lexical rules propose aspects; the supplied mandatory ABSA model assigns polarity.
Nothing is written until every prediction in the batch succeeds.
"""
from aspect_extractor import extract_aspect_candidates
from review_identity import review_identity

LABELS = {"POS": "Positivo", "NEG": "Negativo", "NEU": "Neutro"}


def analyze_reviews(reviews, general_pipeline, aspect_analyzer, batch_size=16):
    if batch_size < 1:
        raise ValueError("batch_size must be positive")
    texts = [r["text"] for r in reviews if r["text"]]
    general = general_pipeline(texts, truncation=True, batch_size=batch_size) if texts else []
    if len(general) != len(texts):
        raise ValueError("Incomplete general sentiment batch")
    candidates = [extract_aspect_candidates(r["text"]) if r["text"] else [] for r in reviews]
    pairs = [(c["excerpt"], c["name"], c["target"]) for group in candidates for c in group]
    polarities = aspect_analyzer.predict_many(pairs, batch_size=batch_size) if pairs else []
    if len(polarities) != len(pairs):
        raise ValueError("Incomplete aspect sentiment batch")
    overall_iter, aspect_iter = iter(general), iter(polarities)
    result = []
    for review, group in zip(reviews, candidates):
        text, rating = review["text"], review["rating"]
        if text:
            prediction = next(overall_iter)
            sentiment = LABELS[prediction["label"]]
            score = round(prediction["score"], 4)
        else:
            sentiment = "Positivo" if rating >= 4 else "Negativo" if rating <= 2 else "Neutro"
            score = 1.0  # Deterministic rating rule, not model confidence.
        aspects = []
        for candidate in group:
            polarity = next(aspect_iter)["sentiment"]
            if polarity not in LABELS.values():
                raise ValueError("Unknown ABSA class")
            aspects.append({"name": candidate["name"], "sentiment": polarity, "excerpt": candidate["excerpt"]})
        result.append({
            **review_identity(review.get("review_id"), review["author"], rating, text),
            "author": review["author"], "text": text or "Avaliação sem comentário.",
            "rating": rating, "date": review["date"], "source": "Google Maps",
            "sentimentScore": score, "overallSentiment": sentiment, "aspects": aspects,
        })
    return result
