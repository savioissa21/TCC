"""Fine-tuning reproduzível do BERTimbau para polaridade por aspecto.

O modelo recebe dois segmentos: o texto da avaliação e o aspecto amplo
(Atendimento, Comida, Ambiente ou Preço). A saída é Positivo, Negativo ou
Neutro.
"""

from __future__ import annotations

import argparse
import ast
import json
import math
import random
import time
import urllib.request
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import torch
import transformers
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
)


SOURCE_BASE_URL = (
    "https://huggingface.co/datasets/Multilingual-NLP/M-ABSA/resolve/main"
)
LABELS = ["Negativo", "Neutro", "Positivo"]
LABEL_TO_ID = {label: index for index, label in enumerate(LABELS)}
ID_TO_LABEL = {index: label for label, index in LABEL_TO_ID.items()}
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "artifacts" / "bertimbau-absa"
POLARITY_MAP = {
    "negative": "Negativo",
    "neutral": "Neutro",
    "positive": "Positivo",
}


@dataclass(frozen=True)
class Example:
    text: str
    aspect: str
    target: str
    label: str
    domain: str


def category_to_aspect(category: str) -> str | None:
    """Converte categorias do M-ABSA para os quatro aspectos do projeto."""
    category = category.strip().lower()
    if category.startswith("service "):
        return "Atendimento"
    if category == "ambience general" or category == "location general":
        return "Ambiente"
    if category in {"restaurant prices", "food prices"}:
        return "Preço"
    if category.startswith("food "):
        return "Comida"
    return None


def download_dataset(data_dir: Path, domains: list[str]) -> None:
    for domain in domains:
        for split in ("train", "dev", "test"):
            destination = data_dir / domain / f"{split}.txt"
            if destination.exists():
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            url = f"{SOURCE_BASE_URL}/{domain}/pt/{split}.txt"
            print(f"[DADOS] Baixando {url}")
            urllib.request.urlretrieve(url, destination)


def parse_split(data_dir: Path, domains: list[str], split: str) -> list[Example]:
    examples: dict[tuple[str, str], Example] = {}
    conflicts = 0

    for domain in domains:
        path = data_dir / domain / f"{split}.txt"
        with path.open(encoding="utf-8") as source:
            for raw_line in source:
                raw_line = raw_line.strip()
                if not raw_line or "####" not in raw_line:
                    continue

                text, raw_triplets = raw_line.split("####", 1)
                try:
                    triplets = ast.literal_eval(raw_triplets)
                except (SyntaxError, ValueError):
                    continue

                votes: dict[tuple[str, str], list[str]] = defaultdict(list)
                for triplet in triplets:
                    if len(triplet) < 3:
                        continue
                    aspect = category_to_aspect(str(triplet[1]))
                    label = POLARITY_MAP.get(str(triplet[2]).lower())
                    if aspect and label:
                        raw_target = str(triplet[0]).strip()
                        target = aspect if raw_target.upper() == "NULL" else raw_target
                        votes[(aspect, target)].append(label)

                for (aspect, target), aspect_votes in votes.items():
                    counts = Counter(aspect_votes)
                    most_common = counts.most_common()
                    if len(most_common) > 1 and most_common[0][1] == most_common[1][1]:
                        conflicts += 1
                        continue
                    label = most_common[0][0]
                    key = (text, aspect, target.lower())
                    existing = examples.get(key)
                    if existing and existing.label != label:
                        conflicts += 1
                        examples.pop(key, None)
                        continue
                    examples[key] = Example(
                        text=text,
                        aspect=aspect,
                        target=target,
                        label=label,
                        domain=domain,
                    )

    print(f"[DADOS] {split}: {len(examples)} pares; conflitos descartados: {conflicts}")
    return list(examples.values())


class AspectDataset(Dataset):
    def __init__(self, examples: list[Example], tokenizer, max_length: int) -> None:
        self.examples = examples
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        example = self.examples[index]
        encoded = self.tokenizer(
            example.text,
            f"Aspecto: {example.aspect}; termo-alvo: {example.target}",
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt",
        )
        item = {key: value.squeeze(0) for key, value in encoded.items()}
        item["labels"] = torch.tensor(LABEL_TO_ID[example.label], dtype=torch.long)
        return item


def compute_metrics(labels: list[int], predictions: list[int]) -> dict[str, object]:
    size = len(LABELS)
    confusion = [[0 for _ in range(size)] for _ in range(size)]
    for expected, predicted in zip(labels, predictions):
        confusion[expected][predicted] += 1

    per_class: dict[str, dict[str, float | int]] = {}
    f1_values: list[float] = []
    precision_values: list[float] = []
    recall_values: list[float] = []
    correct = 0

    for class_id, label in enumerate(LABELS):
        true_positive = confusion[class_id][class_id]
        false_positive = sum(confusion[row][class_id] for row in range(size)) - true_positive
        false_negative = sum(confusion[class_id]) - true_positive
        support = sum(confusion[class_id])
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        precision_values.append(precision)
        recall_values.append(recall)
        f1_values.append(f1)
        correct += true_positive
        per_class[label] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": support,
        }

    total = len(labels)
    return {
        "accuracy": round(correct / total, 4) if total else 0.0,
        "macro_precision": round(sum(precision_values) / size, 4),
        "macro_recall": round(sum(recall_values) / size, 4),
        "macro_f1": round(sum(f1_values) / size, 4),
        "per_class": per_class,
        "confusion_matrix": confusion,
        "confusion_matrix_labels": LABELS,
        "samples": total,
    }


@torch.inference_mode()
def evaluate(
    model,
    loader: DataLoader,
    device: torch.device,
    *,
    use_amp: bool,
) -> dict[str, object]:
    model.eval()
    expected: list[int] = []
    predicted: list[int] = []
    total_loss = 0.0

    for batch in loader:
        batch = {key: value.to(device) for key, value in batch.items()}
        with torch.amp.autocast("cuda", enabled=use_amp):
            output = model(**batch)
        total_loss += output.loss.item()
        expected.extend(batch["labels"].cpu().tolist())
        predicted.extend(output.logits.argmax(dim=-1).cpu().tolist())

    metrics = compute_metrics(expected, predicted)
    metrics["loss"] = round(total_loss / max(len(loader), 1), 4)
    return metrics


def class_weights(examples: list[Example], device: torch.device) -> torch.Tensor:
    counts = Counter(example.label for example in examples)
    total = len(examples)
    weights = [total / (len(LABELS) * counts[label]) for label in LABELS]
    return torch.tensor(weights, dtype=torch.float, device=device)


def limit_examples(examples: list[Example], maximum: int | None, seed: int) -> list[Example]:
    if not maximum or maximum >= len(examples):
        return examples
    rng = random.Random(seed)
    selected = examples.copy()
    rng.shuffle(selected)
    return selected[:maximum]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-name", default="neuralmind/bert-base-portuguese-cased")
    parser.add_argument("--data-dir", type=Path, default=Path("data/mabsa"))
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--domains", nargs="+", default=["restaurant", "food"])
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--gradient-accumulation-steps", type=int, default=1)
    parser.add_argument("--balanced-sampling", action="store_true")
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--warmup-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-train-samples", type=int)
    parser.add_argument("--max-eval-samples", type=int)
    parser.add_argument("--log-every", type=int, default=25)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TREINO] Dispositivo: {device}")
    if device.type == "cuda":
        properties = torch.cuda.get_device_properties(0)
        print(
            f"[TREINO] GPU: {properties.name}; "
            f"VRAM: {properties.total_memory / 1024**3:.1f} GB"
        )

    download_dataset(args.data_dir, args.domains)
    train_examples = limit_examples(
        parse_split(args.data_dir, args.domains, "train"), args.max_train_samples, args.seed
    )
    dev_examples = limit_examples(
        parse_split(args.data_dir, args.domains, "dev"), args.max_eval_samples, args.seed
    )
    test_examples = limit_examples(
        parse_split(args.data_dir, args.domains, "test"), args.max_eval_samples, args.seed
    )

    print("[DADOS] Treino por classe:", dict(Counter(item.label for item in train_examples)))
    print("[DADOS] Treino por aspecto:", dict(Counter(item.aspect for item in train_examples)))

    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=len(LABELS),
        id2label=ID_TO_LABEL,
        label2id=LABEL_TO_ID,
    ).to(device)

    sampler = None
    if args.balanced_sampling:
        counts = Counter(example.label for example in train_examples)
        sample_weights = [1.0 / counts[example.label] for example in train_examples]
        sampler = WeightedRandomSampler(
            weights=sample_weights,
            num_samples=len(train_examples),
            replacement=True,
        )
        print("[DADOS] Amostragem balanceada ativada.")

    train_loader = DataLoader(
        AspectDataset(train_examples, tokenizer, args.max_length),
        batch_size=args.batch_size,
        shuffle=sampler is None,
        sampler=sampler,
    )
    dev_loader = DataLoader(
        AspectDataset(dev_examples, tokenizer, args.max_length),
        batch_size=args.batch_size,
    )
    test_loader = DataLoader(
        AspectDataset(test_examples, tokenizer, args.max_length),
        batch_size=args.batch_size,
    )

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    updates_per_epoch = math.ceil(len(train_loader) / args.gradient_accumulation_steps)
    total_steps = updates_per_epoch * args.epochs
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(total_steps * args.warmup_ratio),
        num_training_steps=total_steps,
    )
    loss_function = torch.nn.CrossEntropyLoss(
        weight=None if args.balanced_sampling else class_weights(train_examples, device)
    )
    use_amp = device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    best_macro_f1 = -1.0
    history: list[dict[str, object]] = []
    started_at = time.time()

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        epoch_started_at = time.time()
        optimizer.zero_grad(set_to_none=True)

        for step, batch in enumerate(train_loader, start=1):
            batch = {key: value.to(device) for key, value in batch.items()}
            labels = batch.pop("labels")
            with torch.amp.autocast("cuda", enabled=use_amp):
                logits = model(**batch).logits
                raw_loss = loss_function(logits, labels)
                loss = raw_loss / args.gradient_accumulation_steps
            scaler.scale(loss).backward()
            running_loss += raw_loss.item()

            should_update = (
                step % args.gradient_accumulation_steps == 0
                or step == len(train_loader)
            )
            if should_update:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                scaler.step(optimizer)
                scaler.update()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)

            if step % args.log_every == 0 or step == len(train_loader):
                print(
                    f"[TREINO] época {epoch}/{args.epochs} passo {step}/{len(train_loader)} "
                    f"loss={running_loss / step:.4f}"
                )

        dev_metrics = evaluate(model, dev_loader, device, use_amp=use_amp)
        epoch_result = {
            "epoch": epoch,
            "train_loss": round(running_loss / max(len(train_loader), 1), 4),
            "dev": dev_metrics,
            "seconds": round(time.time() - epoch_started_at, 1),
        }
        history.append(epoch_result)
        print(f"[VALIDAÇÃO] {json.dumps(dev_metrics, ensure_ascii=False)}")

        if float(dev_metrics["macro_f1"]) > best_macro_f1:
            best_macro_f1 = float(dev_metrics["macro_f1"])
            model.save_pretrained(args.output_dir)
            tokenizer.save_pretrained(args.output_dir)
            print(f"[MODELO] Melhor checkpoint salvo em {args.output_dir}")

    best_model = AutoModelForSequenceClassification.from_pretrained(args.output_dir).to(device)
    test_metrics = evaluate(best_model, test_loader, device, use_amp=use_amp)
    report = {
        "model_name": args.model_name,
        "domains": args.domains,
        "seed": args.seed,
        "training_examples": len(train_examples),
        "validation_examples": len(dev_examples),
        "test_examples": len(test_examples),
        "labels": LABELS,
        "aspects": sorted({example.aspect for example in train_examples}),
        "history": history,
        "test": test_metrics,
        "total_seconds": round(time.time() - started_at, 1),
        "dataset_source": "Multilingual-NLP/M-ABSA",
        "dataset_note": "Corpus multilíngue; os textos em português são traduções do corpus original.",
        "software_versions": {
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "numpy": np.__version__,
        },
    }
    (args.output_dir / "training_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (args.output_dir / "training_args.json").write_text(
        json.dumps(vars(args), ensure_ascii=False, indent=2, default=str), encoding="utf-8"
    )
    (args.output_dir / "dataset_examples.json").write_text(
        json.dumps([asdict(item) for item in test_examples[:25]], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[TESTE] {json.dumps(test_metrics, ensure_ascii=False)}")
    print(f"[FIM] Relatório salvo em {args.output_dir / 'training_report.json'}")


if __name__ == "__main__":
    main()
