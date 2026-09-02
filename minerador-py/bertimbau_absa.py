"""Inferência de polaridade condicionada ao aspecto com BERTimbau."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from absa_model_validation import (
    AbsaModelError,
    DEFAULT_MODEL_DIR,
    model_is_available,
    require_absa_model,
)


class AspectSentimentAnalyzer:
    """Classifica a polaridade de um texto para um aspecto específico."""

    def __init__(
        self,
        model_path: str | Path = DEFAULT_MODEL_DIR,
        device: str | None = None,
    ) -> None:
        self.model_path = require_absa_model(model_path)
        self.device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path,
                local_files_only=True,
            )
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_path,
                local_files_only=True,
            ).to(self.device)
        except Exception as error:
            raise AbsaModelError(
                f'Não foi possível carregar o checkpoint BERTimbau ABSA em "{self.model_path}". '
                "Confirme se todos os arquivos pertencem à mesma versão do modelo."
            ) from error
        self.model.eval()

    @torch.inference_mode()
    def predict_many(
        self,
        pairs: Iterable[tuple[str, str] | tuple[str, str, str]],
        *,
        batch_size: int = 16,
        max_length: int = 128,
    ) -> list[dict[str, float | str]]:
        try:
            items = [
                (item[0], item[1], item[2] if len(item) == 3 else item[1])
                for item in pairs
            ]
            predictions: list[dict[str, float | str]] = []

            for start in range(0, len(items), batch_size):
                batch = items[start : start + batch_size]
                texts = [text for text, _, _ in batch]
                aspects = [
                    f"Aspecto: {aspect}; termo-alvo: {target}"
                    for _, aspect, target in batch
                ]
                encoded = self.tokenizer(
                    texts,
                    aspects,
                    padding=True,
                    truncation=True,
                    max_length=max_length,
                    return_tensors="pt",
                )
                encoded = {key: value.to(self.device) for key, value in encoded.items()}
                logits = self.model(**encoded).logits
                probabilities = torch.softmax(logits, dim=-1)
                scores, label_ids = probabilities.max(dim=-1)

                for label_id, score in zip(label_ids.tolist(), scores.tolist()):
                    label = self.model.config.id2label[label_id]
                    predictions.append({"sentiment": label, "score": round(score, 4)})

            return predictions
        except AbsaModelError:
            raise
        except Exception as error:
            raise AbsaModelError(
                "O BERTimbau ABSA falhou durante a inferência; a mineração foi interrompida "
                "para não gravar resultados parciais ou gerados por outro modelo."
            ) from error

    def predict(
        self,
        text: str,
        aspect: str,
        target: str | None = None,
    ) -> dict[str, float | str]:
        return self.predict_many([(text, aspect, target or aspect)])[0]
