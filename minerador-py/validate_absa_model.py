"""Preflight usado pelo Docker para impedir a API de iniciar sem o modelo ABSA."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from absa_model_validation import (
    AbsaModelError,
    DEFAULT_MODEL_DIR,
    calculate_checkpoint_sha256,
    require_absa_model,
)


def configured_model_path(explicit_path: str | None = None) -> Path:
    configured_path = explicit_path or os.getenv("ABSA_MODEL_PATH")
    return Path(configured_path) if configured_path else DEFAULT_MODEL_DIR


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida o checkpoint BERTimbau ABSA.")
    parser.add_argument(
        "--model-path",
        help="Caminho do checkpoint; por padrão usa ABSA_MODEL_PATH ou a saída local do treino.",
    )
    parser.add_argument(
        "--sha256",
        help="SHA-256 esperado do checkpoint; por padrão usa ABSA_MODEL_SHA256.",
    )
    parser.add_argument(
        "--print-sha256",
        action="store_true",
        help="Valida o modelo e imprime o SHA-256 do checkpoint completo.",
    )
    args = parser.parse_args(argv)

    try:
        expected_sha256 = (
            None if args.print_sha256 else args.sha256 or os.getenv("ABSA_MODEL_SHA256")
        )
        model_path = require_absa_model(
            configured_model_path(args.model_path),
            expected_sha256,
            require_checksum=not args.print_sha256,
        )
        from bertimbau_absa import AspectSentimentAnalyzer

        analyzer = AspectSentimentAnalyzer(model_path, device="cpu")
        analyzer.predict(
            "A comida estava excelente.",
            "Comida",
            "comida",
        )
    except AbsaModelError as error:
        print(f"[FATAL] {error}", file=sys.stderr, flush=True)
        return 1
    except Exception as error:
        print(
            f"[FATAL] Não foi possível validar o runtime do BERTimbau ABSA: {error}",
            file=sys.stderr,
            flush=True,
        )
        return 1

    print(
        f"[IA] Checkpoint BERTimbau ABSA carregado e validado em {model_path}.",
        flush=True,
    )
    if args.print_sha256:
        print(f"ABSA_MODEL_SHA256={calculate_checkpoint_sha256(model_path)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
