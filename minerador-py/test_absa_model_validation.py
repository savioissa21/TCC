from __future__ import annotations

import json
import shutil
import unittest
from contextlib import contextmanager
from pathlib import Path

from absa_model_validation import (
    AbsaModelError,
    calculate_checkpoint_sha256,
    model_is_available,
    model_validation_problems,
    require_absa_model,
)


VALID_CONFIG = {
    "model_type": "bert",
    "id2label": {"0": "Negativo", "1": "Neutro", "2": "Positivo"},
}
TEST_TEMP_ROOT = Path(__file__).resolve().parent


class AbsaModelValidationTest(unittest.TestCase):
    @contextmanager
    def checkpoint_directory(self):
        path = TEST_TEMP_ROOT / ".absa-model-validation-test"
        if path.exists():
            shutil.rmtree(path)
        path.mkdir()
        try:
            yield path
        finally:
            shutil.rmtree(path, ignore_errors=True)

    def write_file(self, directory: Path, name: str, content: str = "data") -> None:
        (directory / name).write_text(content, encoding="utf-8")

    def create_valid_checkpoint(self, directory: Path) -> None:
        self.write_file(directory, "config.json", json.dumps(VALID_CONFIG))
        self.write_file(directory, "model.safetensors")
        self.write_file(directory, "tokenizer_config.json", "{}")
        self.write_file(directory, "vocab.txt", "[PAD]\n[UNK]\n")

    def test_missing_directory_fails_with_setup_instructions(self) -> None:
        with self.checkpoint_directory() as path:
            missing_path = path / "missing"

            with self.assertRaisesRegex(AbsaModelError, "ABSA_MODEL_HOST_PATH"):
                require_absa_model(missing_path)

    def test_checkpoint_without_weights_is_rejected(self) -> None:
        with self.checkpoint_directory() as path:
            self.write_file(path, "config.json", json.dumps(VALID_CONFIG))
            self.write_file(path, "tokenizer_config.json", "{}")
            self.write_file(path, "vocab.txt")

            self.assertIn("pesos ausentes", "; ".join(model_validation_problems(path)))

    def test_checkpoint_without_tokenizer_is_rejected(self) -> None:
        with self.checkpoint_directory() as path:
            self.write_file(path, "config.json", json.dumps(VALID_CONFIG))
            self.write_file(path, "model.safetensors")

            problems = "; ".join(model_validation_problems(path))
            self.assertIn("tokenizer", problems)
            self.assertFalse(model_is_available(path))

    def test_empty_checkpoint_files_are_rejected(self) -> None:
        with self.checkpoint_directory() as path:
            for name in (
                "config.json",
                "model.safetensors",
                "tokenizer_config.json",
                "vocab.txt",
            ):
                self.write_file(path, name, "")

            self.assertFalse(model_is_available(path))

    def test_wrong_label_mapping_is_rejected(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)
            wrong_config = dict(VALID_CONFIG)
            wrong_config["id2label"] = {"0": "LABEL_0", "1": "LABEL_1", "2": "LABEL_2"}
            self.write_file(path, "config.json", json.dumps(wrong_config))

            self.assertIn("0=Negativo", "; ".join(model_validation_problems(path)))

    def test_corrupted_config_is_rejected(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)
            self.write_file(path, "config.json", "{invalid-json")

            self.assertIn(
                "configuração do modelo inválido",
                "; ".join(model_validation_problems(path)),
            )

    def test_complete_checkpoint_is_accepted(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)

            self.assertEqual(require_absa_model(path), path)
            self.assertTrue(model_is_available(path))

    def test_checksum_is_required_for_application_preflight(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)

            with self.assertRaisesRegex(AbsaModelError, "ABSA_MODEL_SHA256 não foi definido"):
                require_absa_model(path, require_checksum=True)

    def test_matching_checksum_accepts_expected_checkpoint_version(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)
            checksum = calculate_checkpoint_sha256(path)

            self.assertEqual(
                require_absa_model(path, checksum, require_checksum=True),
                path,
            )

    def test_wrong_checksum_rejects_another_checkpoint_version(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)

            with self.assertRaisesRegex(AbsaModelError, "não corresponde"):
                require_absa_model(path, "0" * 64, require_checksum=True)

    def test_malformed_checksum_is_rejected(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)

            with self.assertRaisesRegex(AbsaModelError, "64 caracteres hexadecimais"):
                require_absa_model(path, "hash-invalido", require_checksum=True)

    def test_checksum_covers_tokenizer_and_configuration(self) -> None:
        with self.checkpoint_directory() as path:
            self.create_valid_checkpoint(path)
            original_checksum = calculate_checkpoint_sha256(path)

            self.write_file(path, "vocab.txt", "[PAD]\n[UNK]\ncomida\n")

            self.assertNotEqual(original_checksum, calculate_checkpoint_sha256(path))


if __name__ == "__main__":
    unittest.main()
