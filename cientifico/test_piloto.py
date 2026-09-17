import json
import tempfile
import unittest
from pathlib import Path

from preparar_piloto import SQL, export_sample, select_sample, safe_cell
from materializar_rascunho import materialize, validate_draft
from gerar_caderno import render_notebook


def rows():
    return [{"source_id": f"r{s}-{i}", "store_id": s, "text": f"Texto {s} {i} " + "x" * (i * 90)}
            for s in (1, 2) for i in range(6)]


def draft(review_id="P001", excerpt="Bom atendimento"):
    return {"status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "predictions_consulted": False,
            "guide_version": "0.1", "reviews": [{"id": review_id, "notes": "", "mentions": [
                [excerpt, "Atendimento", "Positivo", "Explicita", "Não", ""]]}]}


class PilotTest(unittest.TestCase):
    def test_selection_is_reproducible_and_balances_stores(self):
        selected, _ = select_sample(rows(), 6, "seed")
        reordered, _ = select_sample(list(reversed(rows())), 6, "seed")
        self.assertEqual(selected, reordered)
        self.assertEqual([r["store_id"] for r in selected], [1, 2, 1, 2, 1, 2])
        self.assertEqual({r["length_group"] for r in selected}, {"curto", "medio", "longo"})

    def test_excludes_empty_and_exact_normalized_duplicates(self):
        source = [{"source_id": "1", "store_id": 1, "text": "  Ótimo   lugar "},
                  {"source_id": "2", "store_id": 2, "text": "ótimo lugar"},
                  {"source_id": "3", "store_id": 2, "text": " "}]
        selected, meta = select_sample(source, 30, "seed")
        self.assertEqual(len(selected), 1)
        self.assertEqual(meta["exclusions"], {"sem_texto": 1, "texto_repetido_normalizado": 1})

    def test_query_does_not_read_predictions_or_authorship(self):
        self.assertIn("READ ONLY", SQL)
        for field in ("author", "rating", "overall_sentiment", "sentiment_score", "JOIN aspect"):
            self.assertNotIn(field, SQL)

    def test_protects_spreadsheet_formulas(self):
        self.assertEqual(safe_cell(" =1+1"), "' =1+1")
        self.assertEqual(safe_cell("Bom atendimento"), "Bom atendimento")

    def test_export_hides_model_predictions_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "pilot"
            export_sample(rows(), folder, 3, "seed")
            text = (folder / "01_avaliacoes_CEGO.csv").read_text(encoding="utf-8-sig")
            self.assertNotIn("source_id", text)
            self.assertNotIn("polaridade", text)
            self.assertNotIn("rating", text)
            self.assertEqual(len((folder / "02_presenca_CEGO.csv").read_text(encoding="utf-8-sig").splitlines()), 13)
            with self.assertRaises(FileExistsError):
                export_sample(rows(), folder, 3, "seed")

    def test_rejects_empty_sample_before_creating_files(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "pilot"
            with self.assertRaises(ValueError):
                export_sample([], folder, 30, "seed")
            self.assertFalse(folder.exists())

    def test_validates_literal_evidence_and_complete_coverage(self):
        sample = [{"avaliacao_id": "P001", "texto": "Bom atendimento!"}]
        validate_draft(sample, draft())
        with self.assertRaises(ValueError):
            validate_draft(sample, draft(excerpt="Outro texto"))
        with self.assertRaises(ValueError):
            validate_draft(sample, draft(review_id="P002"))

    def test_draft_keeps_human_labels_empty_and_protects_revision(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "pilot"
            export_sample([{"source_id": "a", "store_id": 1, "text": "Bom atendimento!"}], folder, 1, "seed")
            (folder / "rascunho_ia.json").write_text(json.dumps(draft()), encoding="utf-8")
            result = materialize(folder)
            self.assertEqual(result["human_labels_completed"], 0)
            self.assertEqual(result["presence_rows"], 4)
            self.assertEqual(materialize(folder, validate_only=True), result)
            with self.assertRaises(FileExistsError):
                materialize(folder)

    def test_notebook_escapes_review_html_and_marks_ai_origin(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "pilot"
            export_sample([{"source_id": "a", "store_id": 1, "text": "Bom atendimento! <script>alert(1)</script>"}], folder, 1, "seed")
            (folder / "rascunho_ia.json").write_text(json.dumps(draft()), encoding="utf-8")
            output = render_notebook(folder)
            self.assertNotIn("<script>", output)
            self.assertIn("&lt;script&gt;", output)
            self.assertIn("Rascunho produzido por IA", output)
            self.assertIn("1 avaliações para revisar", output)


if __name__ == "__main__":
    unittest.main()
