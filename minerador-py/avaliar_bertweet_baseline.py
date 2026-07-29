"""Avalia o classificador geral BERTweet no teste ABSA reservado."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from transformers import pipeline

from treinar_bertimbau_absa import (
    LABEL_TO_ID,
    compute_metrics,
    download_dataset,
    parse_split,
)


MODEL_NAME = "pysentimiento/bertweet-pt-sentiment"
LABEL_MAP = {"NEG": "Negativo", "NEU": "Neutro", "POS": "Positivo"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("data/mabsa"))
    parser.add_argument("--domains", nargs="+", default=["restaurant", "food"])
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/bertweet-baseline-report.json"),
    )
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    download_dataset(args.data_dir, args.domains)
    examples = parse_split(args.data_dir, args.domains, "test")
    classifier = pipeline(
        "sentiment-analysis",
        model=MODEL_NAME,
        device=0 if torch.cuda.is_available() else -1,
    )
    outputs = classifier(
        [example.text for example in examples],
        batch_size=args.batch_size,
        truncation=True,
        max_length=128,
    )
    expected = [LABEL_TO_ID[example.label] for example in examples]
    predicted = [
        LABEL_TO_ID[LABEL_MAP.get(output["label"], "Neutro")]
        for output in outputs
    ]
    report = {
        "model_name": MODEL_NAME,
        "task": "Sentimento geral aplicado como baseline a cada par de aspecto",
        "test": compute_metrics(expected, predicted),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
