"""Fornecedor determinístico, SOMENTE no alvo Docker e2e. Sem rede ou IA."""
import json
import os
import sys
import time
from pathlib import Path

if "MINING_OUTPUT_FILE" not in os.environ:
    raise SystemExit("Execução permitida somente pelo contrato do processo minerador.")

url = sys.argv[1]
time.sleep(4)  # Permite observar RUNNING e sair/reabrir o acompanhamento.
if "/failure" in url:
    print("[MINING_ERROR] Falha simulada do fornecedor externo", flush=True)
    raise SystemExit(1)

sentiments = ("Positivo", "Neutro", "Negativo")
reviews = [{
    "id": f"fixture-{i}",
    "googleReviewId": f"fixture-google-{i}",
    "author": f"Cliente fictício {i:02}",
    "text": f"Avaliação sintética {i:02}. " + ("Comida ótima." if i % 3 == 0 else "Experiência de teste."),
    "rating": (5, 3, 1)[i % 3],
    "date": "há uma semana",
    "source": "Fixture E2E",
    "overallSentiment": sentiments[i % 3],
    "sentimentScore": 0.8,
    "aspects": [{"name": "Comida", "sentiment": sentiments[i % 3], "excerpt": "Experiência sintética"}],
} for i in range(12)]
payload = {"reviews": reviews, "collectionWarnings": ["TARGET_NOT_REACHED"] if "/partial" in url else []}
Path(os.environ["MINING_OUTPUT_FILE"]).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
print("[FIXTURE_E2E] 12 avaliações sintéticas; nenhuma chamada ao Google ou IA.", flush=True)
