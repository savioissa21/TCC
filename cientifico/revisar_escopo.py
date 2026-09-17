"""Cria nova versão do piloto: não consumo simples fica fora das menções.

Decisão solicitada pelo usuário após inspecionar o piloto, não anotação humana cega.
Não sobrescreve dados/planilhas anteriores e não transforma o rascunho em gold.
"""
import argparse
import copy
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from comparar_piloto import sha256
from aspect_extractor import eligible_experience_segments
from materializar_rascunho import materialize, read_csv, validate_draft


def revise(source: Path, destination: Path) -> dict:
    if destination.exists():
        raise FileExistsError(f"Destino já existe; preservar anotações: {destination}")
    original = json.loads((source / "rascunho_ia.json").read_text(encoding="utf-8"))
    reviews = read_csv(source / "01_avaliacoes_CEGO.csv")
    validate_draft(reviews, original)
    revised = copy.deepcopy(original)
    excluded = []
    for review in revised["reviews"]:
        kept = []
        for index, mention in enumerate(review["mentions"], 1):
            if mention[1] == "Comida" and not eligible_experience_segments(mention[0]):
                excluded.append({"original_mention_id": f'{review["id"]}-M{index:02d}', "review_id": review["id"],
                                 "text": mention[0], "aspect": mention[1], "original_reference_ai": mention[2],
                                 "reason": "Declaração simples de não experimentação: fora das menções elegíveis, sem polaridade."})
            else:
                kept.append(mention)
        if len(kept) != len(review["mentions"]):
            review["notes"] += " [Decisão v0.2: referência de não experimentação excluída; outras opiniões permanecem.]"
        review["mentions"] = kept
    if not excluded:
        raise ValueError("Nenhuma declaração simples de não experiência encontrada; revisão não criada.")
    revised.update({"guide_version": "0.2", "predictions_consulted": True, "excluded_mentions": excluded,
                    "scope_revision": {"decision_by": "usuario", "after_model_inspection": True,
                                       "source_draft_sha256": sha256(source / "rascunho_ia.json"),
                                       "revised_at_utc": datetime.now(timezone.utc).isoformat(),
                                       "rule": "Excluir não experimentação/consumo simples; não relabelar como Neutro.",
                                       "no_model_retraining": True}})
    validate_draft(reviews, revised)
    destination.mkdir(parents=True)
    for name in ("01_avaliacoes_CEGO.csv", "02_presenca_CEGO.csv", "03_mencoes_CEGO.csv", "vinculo_privado.json"):
        if (source / name).exists():
            shutil.copy2(source / name, destination / name)
    manifest = json.loads((source / "manifesto.json").read_text(encoding="utf-8"))
    manifest.update({"guide_version": "0.2", "scope_revision": revised["scope_revision"],
                     "original_pilot_folder": source.name, "exclusions_from_mentions": len(excluded)})
    (destination / "manifesto.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (destination / "rascunho_ia.json").write_text(json.dumps(revised, ensure_ascii=False, indent=2), encoding="utf-8")
    return materialize(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(revise(args.source, args.destination), ensure_ascii=False, indent=2))
