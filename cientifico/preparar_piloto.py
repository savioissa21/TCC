"""Exporta um piloto cego de dados existentes; não consulta previsões nem altera o banco."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
import unicodedata
from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASPECTS = ("Atendimento", "Comida", "Ambiente", "Preço")
SQL = """
BEGIN TRANSACTION READ ONLY;
SELECT coalesce(json_agg(row_to_json(sample)), '[]'::json)
FROM (
 SELECT r.id AS source_id, r.establishment_id AS store_id, r.text,
        r.collected_at, r.source
 FROM review r
 ORDER BY r.establishment_id, r.id
) sample;
COMMIT;
"""


def read_database(container: str) -> list[dict]:
    # Credenciais resolvidas dentro do contêiner; não lê .env nem as imprime.
    result = subprocess.run(
        ["docker", "exec", "-i", container, "sh", "-c",
         'exec psql -X -q -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
        input=SQL, text=True, encoding="utf-8", capture_output=True, check=True,
    )
    rows = json.loads(result.stdout)
    if not isinstance(rows, list):
        raise ValueError("A consulta não retornou uma lista de avaliações.")
    return rows


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text).casefold()).strip()


def length_group(text: str) -> str:
    return "curto" if len(text) < 80 else "medio" if len(text) <= 250 else "longo"


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def select_sample(rows: list[dict], size: int, seed: str) -> tuple[list[dict], dict]:
    if size < 1:
        raise ValueError("O tamanho deve ser positivo.")
    # Cópias idênticas (inclusive entre lojas) não ocupam várias vagas.
    # Não exclui textos genéricos: são necessários para avaliar falsos positivos.
    eligible, seen = [], set()
    excluded = Counter()
    for row in sorted(rows, key=lambda r: (str(r["store_id"]), str(r["source_id"]))):
        text = (row.get("text") or "").strip()
        if not text:
            excluded["sem_texto"] += 1
            continue
        key = normalized(text)
        if key in seen:
            excluded["texto_repetido_normalizado"] += 1
            continue
        seen.add(key)
        eligible.append({**row, "text": text, "length_group": length_group(text)})
    strata = defaultdict(list)
    for row in eligible:
        strata[(str(row["store_id"]), row["length_group"])].append(row)
    for values in strata.values():
        values.sort(key=lambda r: digest(f'{seed}|{r["store_id"]}|{r["source_id"]}'))
    stores = sorted({s for s, _ in strata})
    queues = {}
    for store in stores:
        groups = [deque(strata[(store, group)]) for group in ("curto", "medio", "longo")]
        queue = deque()
        while any(groups):
            for group in groups:
                if group:
                    queue.append(group.popleft())
        queues[store] = queue
    sample = []
    while len(sample) < size and any(queues.values()):
        for store in stores:
            if queues[store] and len(sample) < size:
                sample.append(queues[store].popleft())
    metadata = {
        "available_rows": len(rows), "eligible_unique_texts": len(eligible),
        "exclusions": dict(excluded), "requested": size, "selected": len(sample),
        "seed": seed, "selection": "Rodízio por loja e comprimento; desempate SHA-256(seed|loja|id).",
        "length_groups": {"curto": "1–79 caracteres", "medio": "80–250 caracteres", "longo": ">250 caracteres"},
        "sample_role": "piloto_desenvolvimento_NAO_teste_final",
        "uses_predictions": False, "uses_ratings": False,
        "representativeness": "Amostra de conveniência diversificada, não estimativa representativa da população.",
    }
    return sample, metadata


def write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    # UTF-8 BOM + ponto e vírgula: abertura em Excel pt-BR.
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields, delimiter=";")
        writer.writeheader()
        # Evitar fórmulas executáveis ao abrir conteúdo externo em planilhas.
        writer.writerows({key: safe_cell(value) for key, value in row.items()} for row in rows)


def safe_cell(value: object) -> object:
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def export_sample(rows: list[dict], output: Path, size: int, seed: str) -> dict:
    # Nunca sobrescrever uma anotação humana anterior.
    if output.exists():
        raise FileExistsError(f"Escolha uma pasta nova; destino já existe: {output}")
    sample, metadata = select_sample(rows, size, seed)
    if not sample:
        raise ValueError("Não há avaliações com texto para anotar; nenhum arquivo foi criado.")
    output.mkdir(parents=True)
    stores = {store: f"E{i:02d}" for i, store in enumerate(sorted({str(r['store_id']) for r in sample}), 1)}
    reviews, presence, mapping = [], [], []
    for index, row in enumerate(sample, 1):
        review_id = f"P{index:03d}"
        store = stores[str(row["store_id"])]
        reviews.append({"avaliacao_id": review_id, "loja_codigo": store, "texto": row["text"],
                        "incluir": "", "motivo_exclusao": "", "sem_aspecto": "", "observacoes": ""})
        for aspect in ASPECTS:
            presence.append({"avaliacao_id": review_id, "aspecto": aspect, "presente": "", "observacoes": ""})
        mapping.append({"avaliacao_id": review_id, "loja_codigo": store,
                        "source_id": row["source_id"], "store_id": row["store_id"],
                        "collected_at": row.get("collected_at"), "source": row.get("source"),
                        "text_sha256": digest(row["text"])})
    write_csv(output / "01_avaliacoes_CEGO.csv", list(reviews[0]), reviews)
    write_csv(output / "02_presenca_CEGO.csv", list(presence[0]), presence)
    write_csv(output / "03_mencoes_CEGO.csv", ["avaliacao_id", "mencao_id", "trecho", "aspecto", "polaridade",
                                             "explicitude", "duvida", "observacoes"], [])
    (output / "vinculo_privado.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
    metadata.update({"exported_at_utc": datetime.now(timezone.utc).isoformat(),
                     "exporter_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                     "csv_formula_protection": "Apóstrofo prefixado em células iniciadas por = + - @ (ignorando espaços).",
                     "counts_by_store": dict(Counter(stores[str(r["store_id"])] for r in sample)),
                     "counts_by_length": dict(Counter(r["length_group"] for r in sample)),
                     "annotation_status": "NAO_ANOTADO_HUMANAMENTE", "author_fields_exported": False,
                     "privacy": "Campo autor omitido; textos podem conter dados pessoais. Não publicar sem revisão.",
                     "text_set_sha256": digest("\n".join(sorted(digest(r["text"]) for r in sample)))})
    (output / "manifesto.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", default="dashboard_db")
    parser.add_argument("--size", type=int, default=30)
    parser.add_argument("--seed", default="tcc-piloto-v1-20260916")
    parser.add_argument("--output", type=Path, default=ROOT / "dados_locais" / datetime.now().strftime("piloto_%Y%m%d_%H%M%S"))
    args = parser.parse_args()
    metadata = export_sample(read_database(args.container), args.output, args.size, args.seed)
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"Arquivos locais: {args.output}")


if __name__ == "__main__":
    main()
