"""Comparação exploratória local, sem retreino, coleta ou alterações na aplicação."""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter

from materializar_rascunho import read_csv, validate_draft
from preparar_piloto import write_csv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "minerador-py"))
LABELS = ["Negativo", "Neutro", "Positivo"]
MODELS = ["bertweet", "bertimbau"]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def metrics(expected: list[str], predicted: list[str]) -> dict:
    if len(expected) != len(predicted) or not expected:
        raise ValueError("As listas precisam ter o mesmo tamanho e não podem ser vazias.")
    if any(value not in LABELS for value in expected + predicted):
        raise ValueError("Rótulo desconhecido: não converter silenciosamente para Neutro.")
    matrix = [[0] * len(LABELS) for _ in LABELS]
    for gold, output in zip(expected, predicted):
        matrix[LABELS.index(gold)][LABELS.index(output)] += 1
    per_class = {}
    for index, label in enumerate(LABELS):
        tp = matrix[index][index]
        support = sum(matrix[index])
        positives = sum(row[index] for row in matrix)
        precision = tp / positives if positives else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"support": support, "precision": precision, "recall": recall, "f1": f1}
    matches = sum(matrix[i][i] for i in range(3))
    return {"n": len(expected), "matches": matches, "accuracy": matches / len(expected),
            "precision_macro": sum(x["precision"] for x in per_class.values()) / 3,
            "recall_macro": sum(x["recall"] for x in per_class.values()) / 3,
            "f1_macro": sum(x["f1"] for x in per_class.values()) / 3,
            "labels": LABELS, "confusion_matrix": matrix, "per_class": per_class,
            "zero_division": 0, "matrix_axes": "linhas=rascunho IA; colunas=previsão"}


def prepare_mentions(reviews: list[dict], draft: dict) -> list[dict]:
    validate_draft(reviews, draft)
    result = []
    for review in draft["reviews"]:
        for index, (text, aspect, polarity, explicitness, doubt, note) in enumerate(review["mentions"], 1):
            result.append({"review_id": review["id"], "mention_id": f'{review["id"]}-M{index:02d}',
                           "text": text, "aspect": aspect, "target": aspect,
                           "reference_ai": polarity, "doubt_ai": doubt, "note_ai": note,
                           "explicitness_ai": explicitness})
    return result


def summarize(mentions: list[dict]) -> dict:
    scored = [m for m in mentions if m["reference_ai"] in LABELS]
    if not scored:
        raise ValueError("Não há referências com polaridade definida.")
    def both(rows):
        return {model: metrics([m["reference_ai"] for m in rows], [m[model]["sentiment"] for m in rows]) for model in MODELS}
    agreed = sum(m["bertweet"]["sentiment"] == m["bertimbau"]["sentiment"] for m in mentions)
    return {"against_ai_draft": both(scored), "excluded_indeterminate": len(mentions) - len(scored),
            "by_aspect": {aspect: both([m for m in scored if m["aspect"] == aspect]) for aspect in sorted({m["aspect"] for m in scored})},
            "by_doubt_ai": {value: both([m for m in scored if m["doubt_ai"] == value]) for value in ("Sim", "Não") if any(m["doubt_ai"] == value for m in scored)},
            "models_agree": agreed, "models_disagree": len(mentions) - agreed,
            "agreement_models": agreed / len(mentions)}


def load_inputs(folder: Path):
    reviews = read_csv(folder / "01_avaliacoes_CEGO.csv")
    draft = json.loads((folder / "rascunho_ia.json").read_text(encoding="utf-8"))
    return reviews, draft, prepare_mentions(reviews, draft)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--model", type=Path, default=ROOT / "minerador-py/artifacts/bertimbau-absa")
    parser.add_argument("--device", choices=["cpu", "cuda"], default=None)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--run-name", default=datetime.now().strftime("comparacao_%Y%m%d_%H%M%S"))
    args = parser.parse_args()
    if args.batch_size < 1 or Path(args.run_name).name != args.run_name:
        parser.error("Batch deve ser positivo e run-name deve ser apenas um nome de pasta.")
    output = args.folder / args.run_name
    if output.exists():
        raise FileExistsError(f"Não sobrescrever execução: {output}")
    reviews, draft, mentions = load_inputs(args.folder)

    print("[1/5] Carregando dependências locais e checkpoints (modo offline)...", flush=True)
    import torch
    import transformers
    from huggingface_hub import snapshot_download
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    from absa_model_validation import calculate_checkpoint_sha256
    from bertimbau_absa import AspectSentimentAnalyzer
    from aspect_extractor import extract_aspect_candidates
    torch.set_num_threads(2)
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)
    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA solicitada, mas indisponível neste Python.")
    cache_path = Path(snapshot_download("pysentimiento/bertweet-pt-sentiment", local_files_only=True))
    tokenizer = AutoTokenizer.from_pretrained(cache_path, local_files_only=True)
    bertweet = AutoModelForSequenceClassification.from_pretrained(cache_path, local_files_only=True).to(device).eval()
    bertimbau = AspectSentimentAnalyzer(args.model, device=device)
    label_map = {"NEG": "Negativo", "NEU": "Neutro", "POS": "Positivo"}

    def predict_tweets(texts, max_length):
        predictions = []
        with torch.inference_mode():
            for start in range(0, len(texts), args.batch_size):
                batch = texts[start:start + args.batch_size]
                lengths = [len(tokenizer(text, truncation=False)["input_ids"]) for text in batch]
                encoded = tokenizer(batch, padding=True, truncation=True, max_length=max_length, return_tensors="pt")
                scores, indices = torch.softmax(bertweet(**{k: v.to(device) for k, v in encoded.items()}).logits, dim=-1).max(dim=-1)
                for index, score, length in zip(indices.tolist(), scores.tolist(), lengths):
                    raw_label = bertweet.config.id2label[index]
                    label = label_map.get(raw_label, raw_label)
                    if label not in LABELS:
                        raise ValueError(f"Mapeamento BERTweet não reconhecido: {raw_label}")
                    predictions.append({"sentiment": label, "score": float(score), "tokens_before_truncation": length, "truncated": length > max_length})
        return predictions

    def predict_aspects(rows):
        pairs = [(r["text"], r["aspect"], r["target"]) for r in rows]
        predictions = bertimbau.predict_many(pairs, batch_size=args.batch_size, max_length=128)
        for row, prediction in zip(rows, predictions):
            length = len(bertimbau.tokenizer(row["text"], f'Aspecto: {row["aspect"]}; termo-alvo: {row["target"]}', truncation=False)["input_ids"])
            prediction.update({"tokens_before_truncation": length, "truncated": length > 128})
        return predictions

    print(f"[2/5] Comparando {len(mentions)} pares trecho–aspecto em {device}...", flush=True)
    times = {}
    start = perf_counter()
    tw = predict_tweets([m["text"] for m in mentions], 128)
    times["bertweet_controlled_seconds"] = perf_counter() - start
    start = perf_counter()
    bi = predict_aspects(mentions)
    times["bertimbau_controlled_seconds"] = perf_counter() - start
    for row, tweet, imb in zip(mentions, tw, bi):
        row.update({"bertweet": tweet, "bertimbau": imb})

    print("[3/5] Executando extração atual nas avaliações completas...", flush=True)
    full_length = int(tokenizer.model_max_length)
    if full_length > 10000:
        raise ValueError("Tokenizer não declara limite utilizável para sentimento geral.")
    full_sentiments = predict_tweets([r["texto"] for r in reviews], full_length)
    candidates = []
    operational = []
    references = {r["id"]: {m[1] for m in r["mentions"]} for r in draft["reviews"]}
    for review, sentiment in zip(reviews, full_sentiments):
        extracted = extract_aspect_candidates(review["texto"])
        found = {c["name"] for c in extracted}
        expected = references[review["avaliacao_id"]]
        operational.append({"review_id": review["avaliacao_id"], "bertweet_overall": sentiment,
                            "aspects_reference_ai": sorted(expected), "aspects_detected": sorted(found),
                            "missing_vs_draft": sorted(expected - found), "extra_vs_draft": sorted(found - expected)})
        for index, candidate in enumerate(extracted, 1):
            candidates.append({"review_id": review["avaliacao_id"], "candidate_id": f'{review["avaliacao_id"]}-C{index:02d}',
                               "text": candidate["excerpt"], "aspect": candidate["name"], "target": candidate["target"]})
    if candidates:
        candidate_tw = predict_tweets([c["text"] for c in candidates], 128)
        candidate_bi = predict_aspects(candidates)
        for row, tweet, imb in zip(candidates, candidate_tw, candidate_bi):
            row.update({"bertweet": tweet, "bertimbau": imb})

    print("[4/5] Calculando concordâncias exploratórias e fingerprints...", flush=True)
    tp = sum(len(set(r["aspects_detected"]) & set(r["aspects_reference_ai"])) for r in operational)
    fp = sum(len(r["extra_vs_draft"]) for r in operational)
    fn = sum(len(r["missing_vs_draft"]) for r in operational)
    extraction = {"tp": tp, "fp": fp, "fn": fn, "precision": tp / (tp + fp) if tp + fp else 0,
                  "recall": tp / (tp + fn) if tp + fn else 0, "f1": 2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else 0,
                  "unit": "presença por avaliação–aspecto, referência IA provisória"}
    report = {
        "status": "EXPLORATORIO_CONTRA_RASCUNHO_IA_NAO_GABARITO_HUMANO",
        "guide_version": draft["guide_version"], "scope_revision": draft.get("scope_revision"),
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "input_hashes": {name: sha256(args.folder / name) for name in ["01_avaliacoes_CEGO.csv", "rascunho_ia.json"]},
        "script_sha256": sha256(Path(__file__)), "extractor_sha256": sha256(ROOT / "minerador-py/aspect_extractor.py"),
        "config": {"device": device, "device_name": torch.cuda.get_device_name(0) if device == "cuda" else platform.processor(),
                   "torch": torch.__version__, "transformers": transformers.__version__, "python": platform.python_version(),
                   "seed": 42, "batch_size": args.batch_size, "controlled_max_length": 128, "bertweet_overall_max_length": full_length,
                   "bertweet_id": "pysentimiento/bertweet-pt-sentiment", "bertweet_revision": cache_path.name,
                   "bertweet_checkpoint_sha256": calculate_checkpoint_sha256(cache_path),
                   "bertimbau_checkpoint_sha256": calculate_checkpoint_sha256(args.model),
                   "controlled_target_policy": "termo-alvo = categoria fornecida pelo caderno, sem seleção pelo extrator",
                   "operational_target_policy": "termo-alvo escolhido pelo extrator atual, como na produção",
                   "confidence_note": "Softmax não calibrada: não equivale a chance comprovada de acerto e não se compara entre modelos.",
                   "timing_note": "Tempos de uma execução, com tokenização; não constituem benchmark."},
        "review_count": len(reviews), "mention_count": len(mentions), "candidate_count": len(candidates),
        "metrics": summarize(mentions), "extraction_vs_ai_draft": extraction,
        "timings": times, "mentions": mentions, "operational_reviews": operational, "operational_candidates": candidates,
        "limitations": ["Rascunho produzido por IA, não validado por humano.", "Piloto de uma única loja, não teste final.",
                        "Trechos/aspectos fornecidos no ensaio controlado; não mede extração nem desempenho ponta a ponta.",
                        "BERTweet é baseline geral sobre o trecho; BERTimbau recebe também categoria e termo-alvo.",
                        "Termo-alvo do controlado é a categoria, pois o caderno não anota termos-alvo; difere da produção.",
                        "Modelos com tarefas/treinamentos distintos; não comprova superioridade da arquitetura.",
                        "As métricas são concordância com referência provisória; inclusive o rascunho pode estar errado.",
                        "Não foi auditada sobreposição com dados de treinamento. Ao ver previsões, revisão deixa de ser cega."]}
    output.mkdir(parents=True)
    (output / "resultados.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    flat = [{"avaliacao_id": m["review_id"], "mencao_id": m["mention_id"], "trecho": m["text"], "aspecto": m["aspect"],
             "rascunho_IA": m["reference_ai"], "duvida_IA": m["doubt_ai"],
             "BERTweet": m["bertweet"]["sentiment"], "score_BERTweet": m["bertweet"]["score"],
             "BERTimbau": m["bertimbau"]["sentiment"], "score_BERTimbau": m["bertimbau"]["score"],
             "modelos_divergem": m["bertweet"]["sentiment"] != m["bertimbau"]["sentiment"]} for m in mentions]
    write_csv(output / "comparacao_mencoes.csv", list(flat[0]), flat)
    print("[5/5] Resultados gravados (nenhuma anotação anterior alterada).", flush=True)
    print(json.dumps({"output": str(output), "metrics": report["metrics"]["against_ai_draft"],
                      "extraction": extraction, "disagreements": report["metrics"]["models_disagree"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
