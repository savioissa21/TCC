import json
import tempfile
import unittest
from pathlib import Path

from comparar_piloto import sha256
from gerar_caderno import render_notebook
from materializar_rascunho import read_csv, validate_draft
from preparar_piloto import export_sample
from revisar_escopo import revise


class ScopeRevisionTest(unittest.TestCase):
    def test_excludes_only_nonexperience_and_preserves_original(self):
        with tempfile.TemporaryDirectory() as temp:
            source, dest = Path(temp) / "source", Path(temp) / "v02"
            text = "Não cheguei a experimentar a comida. A bebida estava ótima."
            export_sample([{"source_id": "a", "store_id": 1, "text": text}], source, 1, "seed")
            draft = {"status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "predictions_consulted": False,
                     "guide_version": "0.1", "reviews": [{"id": "P001", "notes": "", "mentions": [
                         ["Não cheguei a experimentar a comida", "Comida", "Neutro", "Explicita", "Sim", ""],
                         ["A bebida estava ótima", "Comida", "Positivo", "Explicita", "Não", ""]]}]}
            original = source / "rascunho_ia.json"
            original.write_text(json.dumps(draft), encoding="utf-8")
            checksum = sha256(original)
            report = revise(source, dest)
            self.assertEqual(report["mentions_suggested"], 1)
            self.assertEqual(sha256(original), checksum)
            revised = json.loads((dest / "rascunho_ia.json").read_text(encoding="utf-8"))
            self.assertTrue(revised["predictions_consulted"])
            self.assertEqual(revised["excluded_mentions"][0]["original_mention_id"], "P001-M01")
            presence = read_csv(dest / "05_presenca_RASCUNHO_IA.csv")
            self.assertEqual(next(row for row in presence if row["aspecto"] == "Comida")["presenca_sugerida_IA"], "Sim")
            page = render_notebook(dest)
            self.assertIn("Não houve retreino", page)
            self.assertIn("não entram no denominador", page)
            self.assertNotIn("As sugestões não foram confrontadas", page)
            with self.assertRaises(FileExistsError):
                revise(source, dest)

    def test_rejects_unattributed_revision_after_predictions(self):
        with self.assertRaisesRegex(ValueError, "proveniência"):
            validate_draft([], {"status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "predictions_consulted": True})

    def test_no_exclusion_does_not_create_revision_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            source, dest = Path(temp) / "source", Path(temp) / "v02"
            export_sample([{"source_id": "a", "store_id": 1, "text": "Pizza boa"}], source, 1, "seed")
            draft = {"status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "predictions_consulted": False,
                     "guide_version": "0.1", "reviews": [{"id": "P001", "notes": "", "mentions": [
                         ["Pizza boa", "Comida", "Positivo", "Explicita", "Não", ""]]}]}
            (source / "rascunho_ia.json").write_text(json.dumps(draft), encoding="utf-8")
            with self.assertRaises(ValueError):
                revise(source, dest)
            self.assertFalse(dest.exists())


if __name__ == '__main__':
    unittest.main()
