"""Validação leve do checkpoint BERTimbau usado na análise por aspecto."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "artifacts" / "bertimbau-absa"
EXPECTED_ID_TO_LABEL = {
    "0": "Negativo",
    "1": "Neutro",
    "2": "Positivo",
}
MODEL_WEIGHT_FILES = (
    "model.safetensors",
    "pytorch_model.bin",
)
TOKENIZER_VOCAB_FILES = (
    "tokenizer.json",
    "vocab.txt",
    "vocab.json",
    "spiece.model",
    "sentencepiece.bpe.model",
    "tokenizer.model",
)


class AbsaModelError(RuntimeError):
    """Erro fatal que impede o uso confiável do modelo ABSA esperado."""


def _non_empty_file(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size > 0
    except OSError:
        return False


def calculate_checkpoint_sha256(model_path: str | Path = DEFAULT_MODEL_DIR) -> str:
    """Calcula um SHA-256 determinístico de todos os arquivos do checkpoint."""
    path = Path(model_path).expanduser()
    try:
        checkpoint_files = sorted(
            (file for file in path.rglob("*") if file.is_file()),
            key=lambda file: file.relative_to(path).as_posix(),
        )
    except OSError as error:
        raise AbsaModelError(
            f'Não foi possível listar os arquivos do checkpoint em "{path}".'
        ) from error
    if not checkpoint_files:
        raise AbsaModelError("Não há arquivos no checkpoint para calcular o SHA-256.")

    # O nome e o tamanho impedem ambiguidades entre diferentes divisões dos bytes.
    digest = hashlib.sha256()
    digest.update(b"tcc-bertimbau-absa-checkpoint-v1\0")
    for checkpoint_file in checkpoint_files:
        relative_name = checkpoint_file.relative_to(path).as_posix().encode("utf-8")
        try:
            file_size = checkpoint_file.stat().st_size
            digest.update(relative_name)
            digest.update(b"\0")
            digest.update(file_size.to_bytes(8, byteorder="big", signed=False))
            with checkpoint_file.open("rb") as opened_file:
                for chunk in iter(lambda: opened_file.read(1024 * 1024), b""):
                    digest.update(chunk)
        except OSError as error:
            raise AbsaModelError(
                f'Não foi possível ler "{checkpoint_file}" para validar o checkpoint.'
            ) from error
    return digest.hexdigest()


def _read_json(path: Path, description: str, problems: list[str]) -> object | None:
    if not _non_empty_file(path):
        problems.append(f"{description} ausente ou vazio ({path.name})")
        return None

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        problems.append(f"{description} inválido ({path.name}: {error})")
        return None


def model_validation_problems(model_path: str | Path = DEFAULT_MODEL_DIR) -> list[str]:
    """Lista problemas estruturais sem carregar PyTorch ou Transformers."""
    path = Path(model_path).expanduser()
    if not path.is_dir():
        return ["o diretório do checkpoint não existe"]

    problems: list[str] = []
    config = _read_json(path / "config.json", "configuração do modelo", problems)
    if config is not None and not isinstance(config, dict):
        problems.append("config.json deve conter um objeto JSON")
    elif isinstance(config, dict):
        if config.get("model_type") != "bert":
            problems.append("config.json não identifica uma arquitetura BERT")

        id_to_label = config.get("id2label")
        normalized_labels = (
            {str(label_id): label for label_id, label in id_to_label.items()}
            if isinstance(id_to_label, dict)
            else None
        )
        if normalized_labels != EXPECTED_ID_TO_LABEL:
            problems.append(
                "config.json deve mapear exatamente 0=Negativo, 1=Neutro e 2=Positivo"
            )

    if not any(_non_empty_file(path / filename) for filename in MODEL_WEIGHT_FILES):
        problems.append(
            "pesos ausentes ou vazios (esperado model.safetensors ou pytorch_model.bin)"
        )

    tokenizer_config = _read_json(
        path / "tokenizer_config.json",
        "configuração do tokenizer",
        problems,
    )
    if tokenizer_config is not None and not isinstance(tokenizer_config, dict):
        problems.append("tokenizer_config.json deve conter um objeto JSON")
    if not any(_non_empty_file(path / filename) for filename in TOKENIZER_VOCAB_FILES):
        problems.append("vocabulário do tokenizer ausente ou vazio")

    return problems


def require_absa_model(
    model_path: str | Path = DEFAULT_MODEL_DIR,
    expected_sha256: str | None = None,
    *,
    require_checksum: bool = False,
) -> Path:
    """Retorna o caminho validado ou interrompe a execução com instruções claras."""
    path = Path(model_path).expanduser()
    problems = model_validation_problems(path)

    normalized_checksum = (expected_sha256 or "").strip().lower()
    if require_checksum and not normalized_checksum:
        problems.append("ABSA_MODEL_SHA256 não foi definido")
    elif normalized_checksum and not re.fullmatch(r"[0-9a-f]{64}", normalized_checksum):
        problems.append("ABSA_MODEL_SHA256 deve conter exatamente 64 caracteres hexadecimais")
    elif normalized_checksum and not problems:
        actual_checksum = calculate_checkpoint_sha256(path)
        if actual_checksum != normalized_checksum:
            problems.append(
                "o SHA-256 do checkpoint completo não corresponde à versão configurada "
                "em ABSA_MODEL_SHA256"
            )

    if problems:
        details = "; ".join(problems)
        raise AbsaModelError(
            f'O checkpoint BERTimbau ABSA obrigatório está ausente ou incompleto em "{path}": '
            f"{details}. O fallback para BERTweet está desativado. Defina ABSA_MODEL_PATH "
            "e ABSA_MODEL_SHA256 ou, no Docker, configure ABSA_MODEL_HOST_PATH e "
            "ABSA_MODEL_SHA256 no arquivo .env para montar a versão correta do checkpoint."
        )
    return path


def model_is_available(model_path: str | Path = DEFAULT_MODEL_DIR) -> bool:
    """Compatibilidade para consumidores existentes; valida o checkpoint completo."""
    return not model_validation_problems(model_path)
