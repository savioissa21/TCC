"""Identidade da avaliação: preserva o ID original e o hash usado pelo importador."""

import hashlib


def review_identity(review_id, author, rating, text):
    google_id = review_id.strip() if review_id and review_id.strip() else None
    source_key = google_id or "|".join(
        [author.strip().lower(), str(rating), " ".join(text.lower().split())]
    )
    return {
        "id": hashlib.sha256(source_key.encode("utf-8")).hexdigest(),
        "googleReviewId": google_id,
    }
