"""Compara BERTweet e BERTimbau no teste M-ABSA, inclusive por aspecto.

O script não treina modelos. Ele reutiliza o checkpoint local selecionado do
BERTimbau e aplica os dois classificadores aos mesmos pares da partição de
teste, preservando a comparação usada no trabalho.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline


ROOT = Path(__file__).resolve().parents[1]
MINER_DIR = ROOT / "minerador-py"
sys.path.insert(0, str(MINER_DIR))

from treinar_bertimbau_absa import (  # noqa: E402
    AspectDataset,
    LABEL_TO_ID,
    compute_metrics,
    download_dataset,
    parse_split,
)


BERTWEET_NAME = "pysentimiento/bertweet-pt-sentiment"
BERTWEET_LABEL_MAP = {"NEG": "Negativo", "NEU": "Neutro", "POS": "Positivo"}


def metrics_by_aspect(examples, predictions: list[int]) -> dict[str, object]:
    result: dict[str, object] = {}
    for aspect in sorted({example.aspect for example in examples}):
        indexes = [index for index, example in enumerate(examples) if example.aspect == aspect]
        expected = [LABEL_TO_ID[examples[index].label] for index in indexes]
        selected_predictions = [predictions[index] for index in indexes]
        result[aspect] = compute_metrics(expected, selected_predictions)
    return result


@torch.inference_mode()
def predict_bertimbau(examples, model_dir: Path, batch_size: int) -> list[int]:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_dir, local_files_only=True
    ).to(device)
    model.eval()
    loader = DataLoader(AspectDataset(examples, tokenizer, 128), batch_size=batch_size)
    predictions: list[int] = []
    for batch in loader:
        inputs = {key: value.to(device) for key, value in batch.items() if key != "labels"}
        output = model(**inputs)
        predictions.extend(output.logits.argmax(dim=-1).cpu().tolist())
    return predictions


def predict_bertweet(examples, batch_size: int) -> list[int]:
    classifier = pipeline(
        "sentiment-analysis",
        model=BERTWEET_NAME,
        device=0 if torch.cuda.is_available() else -1,
    )
    outputs = classifier(
        [example.text for example in examples],
        batch_size=batch_size,
        truncation=True,
        max_length=128,
    )
    return [
        LABEL_TO_ID[BERTWEET_LABEL_MAP.get(output["label"], "Neutro")]
        for output in outputs
    ]


def model_report(examples, predictions: list[int]) -> dict[str, object]:
    expected = [LABEL_TO_ID[example.label] for example in examples]
    return {
        "overall": compute_metrics(expected, predictions),
        "by_aspect": metrics_by_aspect(examples, predictions),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-dir", type=Path, default=MINER_DIR / "data" / "mabsa"
    )
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=MINER_DIR / "artifacts" / "bertimbau-absa",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "resultados" / "comparacao_mabsa.json",
    )
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()

    domains = ["restaurant", "food"]
    download_dataset(args.data_dir, domains)
    examples = parse_split(args.data_dir, domains, "test")

    bertweet_predictions = predict_bertweet(examples, args.batch_size)
    bertimbau_predictions = predict_bertimbau(examples, args.model_dir, args.batch_size)

    report = {
        "dataset": "Multilingual-NLP/M-ABSA",
        "split": "test",
        "domains": domains,
        "samples": len(examples),
        "class_distribution": dict(Counter(example.label for example in examples)),
        "aspect_distribution": dict(Counter(example.aspect for example in examples)),
        "comparison_note": (
            "BERTweet recebe somente o texto; BERTimbau recebe texto, aspecto e termo-alvo. "
            "A comparação mede a adequação dos modelos à tarefa operacional, não isola "
            "apenas o efeito da arquitetura."
        ),
        "bertweet": model_report(examples, bertweet_predictions),
        "bertimbau": model_report(examples, bertimbau_predictions),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
