"""Sentimento geral do comentário inteiro com o BERTweet-PT.

O BERTweet aceita um número limitado de tokens por entrada. Comentários que
cabem nesse limite são classificados de uma só vez, exatamente como antes.
Comentários maiores são divididos em partes consecutivas, com uma pequena
sobreposição para não separar uma ideia no meio. Cada parte é classificada e
as probabilidades das classes são combinadas pela média ponderada pelo número
de tokens de cada parte. Assim, o final de uma avaliação longa também é lido,
em vez de ser descartado pelo corte (truncation).
"""

from __future__ import annotations

from typing import Any

DEFAULT_MAX_TOKENS = 128
OVERLAP_TOKENS = 16
SAFETY_MARGIN_TOKENS = 4
_UNSET_TOKENIZER_LIMIT = 100_000


def model_token_limit(sentiment_pipeline: Any) -> int:
    """Limite de tokens por entrada, incluindo os tokens especiais."""
    tokenizer = sentiment_pipeline.tokenizer
    limit = getattr(tokenizer, "model_max_length", None)
    if isinstance(limit, int) and 0 < limit < _UNSET_TOKENIZER_LIMIT:
        return limit
    return DEFAULT_MAX_TOKENS


def content_token_limit(sentiment_pipeline: Any) -> int:
    """Tokens de texto que cabem em uma entrada, descontando os especiais."""
    tokenizer = sentiment_pipeline.tokenizer
    special = tokenizer.num_special_tokens_to_add(pair=False)
    available = model_token_limit(sentiment_pipeline) - special
    if available - SAFETY_MARGIN_TOKENS <= OVERLAP_TOKENS:
        raise ValueError("O limite de tokens do modelo é pequeno demais para dividir o texto.")
    return available


def split_into_token_chunks(
    text: str,
    tokenizer: Any,
    max_content_tokens: int,
    overlap: int = OVERLAP_TOKENS,
    margin: int = SAFETY_MARGIN_TOKENS,
) -> list[tuple[str, int]]:
    """Divide o texto em partes de até ``max_content_tokens`` tokens.

    Retorna pares (texto da parte, quantidade de tokens). Um texto que cabe
    no limite volta inteiro, sem alteração. As partes ficam ``margin`` tokens
    abaixo do limite, porque o texto de cada parte é tokenizado de novo pelo
    modelo e a contagem pode variar levemente.
    """
    chunk_size = max_content_tokens - margin
    if not 0 <= overlap < chunk_size:
        raise ValueError("A sobreposição deve ser menor que o tamanho da parte.")

    token_ids = tokenizer(text, add_special_tokens=False)["input_ids"]
    if len(token_ids) <= max_content_tokens:
        return [(text, len(token_ids))]

    step = chunk_size - overlap
    chunks: list[tuple[str, int]] = []
    for start in range(0, len(token_ids), step):
        piece = token_ids[start:start + chunk_size]
        chunk_text = tokenizer.decode(piece, skip_special_tokens=True).strip()
        if chunk_text:
            chunks.append((chunk_text, len(piece)))
        if start + chunk_size >= len(token_ids):
            break
    return chunks


def _as_score_list(output: Any) -> list[dict[str, Any]]:
    if isinstance(output, dict):
        return [output]
    if isinstance(output, list) and output and isinstance(output[0], dict):
        return output
    raise RuntimeError("O BERTweet retornou probabilidades em formato inesperado.")


def classify_overall_sentiment(text: str, sentiment_pipeline: Any) -> dict[str, Any]:
    """Classifica o comentário inteiro e devolve ``label``, ``score`` e ``chunks``."""
    chunks = split_into_token_chunks(
        text, sentiment_pipeline.tokenizer, content_token_limit(sentiment_pipeline)
    )

    if len(chunks) <= 1:
        # Comportamento original para textos que cabem no limite.
        result = sentiment_pipeline(text, truncation=True)[0]
        return {"label": result["label"], "score": float(result["score"]), "chunks": 1}

    outputs = sentiment_pipeline([chunk for chunk, _ in chunks], truncation=True, top_k=None)
    if len(outputs) != len(chunks):
        raise RuntimeError("O BERTweet não classificou todas as partes do comentário.")

    totals: dict[str, float] = {}
    total_weight = 0
    for (_, weight), output in zip(chunks, outputs):
        for item in _as_score_list(output):
            totals[item["label"]] = totals.get(item["label"], 0.0) + float(item["score"]) * weight
        total_weight += weight

    label = max(totals, key=totals.get)
    return {"label": label, "score": totals[label] / total_weight, "chunks": len(chunks)}
