"""Valida e converte pré-anotação do assistente em CSV; não executa modelos."""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

from preparar_piloto import ASPECTS, write_csv


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file, delimiter=";"))


def validate_draft(reviews: list[dict], draft: dict) -> None:
    if draft.get("status") != "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO":
        raise ValueError("É obrigatório declarar origem por IA, sem validação humana integral.")
    if draft.get("predictions_consulted") is not False:
        revision = draft.get("scope_revision", {})
        if not (draft.get("predictions_consulted") is True and revision.get("after_model_inspection") is True
                and revision.get("decision_by") == "usuario" and revision.get("source_draft_sha256")):
            raise ValueError("Revisão após consulta às previsões requer proveniência explícita.")
    expected = {r["avaliacao_id"]: r["texto"] for r in reviews}
    entries = draft["reviews"]
    if len({r["id"] for r in entries}) != len(entries):
        raise ValueError("ID de avaliação duplicado no rascunho.")
    if {r["id"] for r in entries} != set(expected):
        raise ValueError("O rascunho deve cobrir exatamente as avaliações selecionadas.")
    for review in entries:
        seen = set()
        for mention in review["mentions"]:
            if len(mention) != 6:
                raise ValueError(f'{review["id"]}: menção precisa de seis campos.')
            excerpt, aspect, polarity, explicitness, doubt, _ = mention
            if not excerpt or excerpt not in expected[review["id"]]:
                raise ValueError(f'{review["id"]}: trecho não corresponde literalmente ao texto: {excerpt!r}')
            if aspect not in ASPECTS or polarity not in ("Positivo", "Negativo", "Neutro", "Indeterminado"):
                raise ValueError(f'{review["id"]}: categoria ou polaridade inválida.')
            if explicitness not in ("Explicita", "Implicita") or doubt not in ("Sim", "Não"):
                raise ValueError(f'{review["id"]}: explicitude ou dúvida inválida.')
            key = (excerpt, aspect, polarity)
            if key in seen:
                raise ValueError(f'{review["id"]}: menção duplicada.')
            seen.add(key)


def materialize(folder: Path, validate_only: bool = False) -> dict:
    reviews = read_csv(folder / "01_avaliacoes_CEGO.csv")
    draft = json.loads((folder / "rascunho_ia.json").read_text(encoding="utf-8"))
    validate_draft(reviews, draft)
    review_rows, presence_rows, mention_rows = [], [], []
    by_id = {r["id"]: r for r in draft["reviews"]}
    for review in reviews:
        proposed = by_id[review["avaliacao_id"]]
        aspects = {m[1] for m in proposed["mentions"]}
        review_rows.append({
            "avaliacao_id": review["avaliacao_id"], "loja_codigo": review["loja_codigo"], "texto": review["texto"],
            "sem_aspecto_sugerido_IA": "Não" if aspects else "Sim", "observacoes_IA": proposed["notes"],
            "incluir_humano": "", "sem_aspecto_humano": "", "observacoes_humano": "",
            "anotador": "", "data_revisao": "", "status": "PENDENTE_REVISAO_HUMANA",
        })
        for aspect in ASPECTS:
            presence_rows.append({"avaliacao_id": review["avaliacao_id"], "aspecto": aspect,
                                  "presenca_sugerida_IA": "Sim" if aspect in aspects else "Não",
                                  "presenca_humana": "", "observacoes_humano": ""})
        for index, (excerpt, aspect, polarity, explicitness, doubt, note) in enumerate(proposed["mentions"], 1):
            mention_rows.append({"avaliacao_id": review["avaliacao_id"], "mencao_id": f'{review["avaliacao_id"]}-M{index:02d}',
                                 "trecho_sugerido_IA": excerpt, "aspecto_sugerido_IA": aspect,
                                 "polaridade_sugerida_IA": polarity, "explicitude_sugerida_IA": explicitness,
                                 "duvida_IA": doubt, "observacoes_IA": note, "manter_humano": "",
                                 "trecho_humano": "", "aspecto_humano": "", "polaridade_humana": "",
                                 "observacoes_humano": "", "anotador": "", "data_revisao": ""})
    report = {
        "status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "guide_version": draft["guide_version"],
        "reviews": len(review_rows), "presence_rows": len(presence_rows), "mentions_suggested": len(mention_rows),
        "mentions_flagged_for_review": sum(m["duvida_IA"] == "Sim" for m in mention_rows),
        "counts_suggested_by_polarity": dict(Counter(m["polaridade_sugerida_IA"] for m in mention_rows)),
        "counts_suggested_by_aspect": dict(Counter(m["aspecto_sugerido_IA"] for m in mention_rows)),
        "literal_excerpts_checked": True, "human_labels_completed": 0,
        "metrics_computed": False, "note": "Contagens provisórias da IA; não são métricas do sistema nem distribuição de rótulos humanos.",
    }
    outputs = [
        ("04_avaliacoes_RASCUNHO_IA.csv", list(review_rows[0]), review_rows),
        ("05_presenca_RASCUNHO_IA.csv", list(presence_rows[0]), presence_rows),
        ("06_mencoes_RASCUNHO_IA.csv", list(mention_rows[0]) if mention_rows else ["avaliacao_id", "mencao_id"], mention_rows),
    ]
    if not validate_only:
        for name in [name for name, _, _ in outputs] + ["relatorio_rascunho.json"]:
            if (folder / name).exists():
                raise FileExistsError(f"Não sobrescrever revisão existente: {folder / name}")
        for name, fields, rows in outputs:
            write_csv(folder / name, fields, rows)
        (folder / "relatorio_rascunho.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    print(json.dumps(materialize(args.folder, args.validate_only), ensure_ascii=False, indent=2))
