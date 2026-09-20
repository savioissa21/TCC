"""Orquestra a extração lexical e a inferência ABSA em um único lote."""

from aspect_extractor import extract_aspect_candidates


def analyze_aspects_with(text, analyzer):
    candidates = extract_aspect_candidates(text)
    if not candidates:
        return []
    predictions = analyzer.predict_many(
        [
            (candidate["excerpt"], candidate["name"], candidate["target"])
            for candidate in candidates
        ]
    )
    return [
        {
            "name": candidate["name"],
            "sentiment": str(prediction["sentiment"]),
            "excerpt": candidate["excerpt"],
        }
        for candidate, prediction in zip(candidates, predictions, strict=True)
    ]
