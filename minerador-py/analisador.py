"""Analisador offline compatível com o mesmo BERTimbau ABSA da aplicação."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path

from transformers import pipeline

from absa_model_validation import (
    DEFAULT_MODEL_DIR,
    require_absa_model,
)
from aspect_extractor import extract_aspect_candidates
from bertimbau_absa import AspectSentimentAnalyzer


INPUT_FILE = "reviews.json"
OUTPUT_FILE = "reviews_processados.json"
SENTIMENT_MAP = {"POS": "Positivo", "NEG": "Negativo", "NEU": "Neutro"}


def configured_model_path() -> Path:
    configured_path = os.getenv("ABSA_MODEL_PATH")
    return Path(configured_path) if configured_path else DEFAULT_MODEL_DIR


def analyze_aspects(
    text: str,
    analyzer: AspectSentimentAnalyzer,
) -> list[dict[str, str]]:
    detected_aspects = []
    for candidate in extract_aspect_candidates(text):
        prediction = analyzer.predict(
            candidate["excerpt"],
            candidate["name"],
            candidate["target"],
        )
        detected_aspects.append(
            {
                "name": candidate["name"],
                "sentiment": str(prediction["sentiment"]),
                "excerpt": candidate["excerpt"],
            }
        )
    return detected_aspects


def process_reviews() -> int:
    try:
        model_path = require_absa_model(
            configured_model_path(),
            os.getenv("ABSA_MODEL_SHA256"),
            require_checksum=True,
        )
        print(f"[IA] Carregando BERTimbau ABSA de {model_path}...", flush=True)
        aspect_analyzer = AspectSentimentAnalyzer(model_path)
        print("[IA] Carregando BERTweet para o sentimento geral...", flush=True)
        overall_analyzer = pipeline(
            "sentiment-analysis",
            model="pysentimiento/bertweet-pt-sentiment",
        )

        input_path = Path(INPUT_FILE)
        if not input_path.is_file():
            raise RuntimeError(
                f"Arquivo {INPUT_FILE} não encontrado. Rode o minerador primeiro."
            )
        reviews = json.loads(input_path.read_text(encoding="utf-8"))

        processed_data = []
        for review in reviews:
            text = review.get("text", "")
            if not text:
                continue

            overall_result = overall_analyzer(text[:512])[0]
            label = overall_result.get("label")
            if label not in SENTIMENT_MAP:
                raise RuntimeError(f"BERTweet retornou uma classe desconhecida: {label}")

            processed_data.append(
                {
                    "id": str(uuid.uuid4()),
                    "sentimentScore": overall_result["score"],
                    "overallSentiment": SENTIMENT_MAP[label],
                    "originalReview": review,
                    "aspects": analyze_aspects(text, aspect_analyzer),
                    "analysisDate": datetime.now().isoformat(),
                }
            )

        Path(OUTPUT_FILE).write_text(
            json.dumps(processed_data, ensure_ascii=False, indent=4),
            encoding="utf-8",
        )
        print(f"[SUCESSO] {len(processed_data)} avaliações salvas em {OUTPUT_FILE}.")
        return 0
    except Exception as error:
        print(f"[ANALYSIS_ERROR] {error}", flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(process_reviews())
