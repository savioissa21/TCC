import json
import tempfile
import unittest
from pathlib import Path

from comparar_piloto import metrics, prepare_mentions, summarize, sha256
from comparacao_html import load_comparison
from preparar_piloto import export_sample
from materializar_rascunho import read_csv


class ComparisonTest(unittest.TestCase):
    def test_metrics_macro_includes_all_three_labels(self):
        result = metrics(["Negativo", "Neutro", "Positivo"], ["Negativo", "Positivo", "Positivo"])
        self.assertEqual(result["matches"], 2)
        self.assertEqual(result["confusion_matrix"], [[1, 0, 0], [0, 0, 1], [0, 0, 1]])
        self.assertAlmostEqual(result["accuracy"], 2 / 3)
        self.assertAlmostEqual(result["f1_macro"], (1 + 0 + 2 / 3) / 3)

    def test_metrics_rejects_silent_label_mapping_and_wrong_lengths(self):
        for gold, pred in [([], []), (["Positivo"], []), (["Neutro"], ["UNKNOWN"])]:
            with self.assertRaises(ValueError):
                metrics(gold, pred)

    def test_prepare_mentions_does_not_use_sentiment_as_target(self):
        source = [{"avaliacao_id": "P001", "texto": "Comida boa"}]
        draft = {"status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "predictions_consulted": False,
                 "reviews": [{"id": "P001", "mentions": [["Comida boa", "Comida", "Positivo", "Explicita", "Não", ""]]}]}
        first = prepare_mentions(source, draft)[0]
        draft["reviews"][0]["mentions"][0][2] = "Negativo"
        second = prepare_mentions(source, draft)[0]
        for field in ("text", "aspect", "target"):
            self.assertEqual(first[field], second[field])
        self.assertEqual(first["target"], "Comida")

    def test_summary_excludes_indeterminate_and_counts_model_disagreements(self):
        mentions = [{"reference_ai": label, "aspect": "Comida", "doubt_ai": "Sim",
                     "bertweet": {"sentiment": "Positivo"}, "bertimbau": {"sentiment": "Neutro"}}
                    for label in ["Positivo", "Indeterminado"]]
        result = summarize(mentions)
        self.assertEqual(result["against_ai_draft"]["bertweet"]["n"], 1)
        self.assertEqual(result["excluded_indeterminate"], 1)
        self.assertEqual(result["models_disagree"], 2)

    def test_report_must_match_snapshot_and_cannot_omit_mentions(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "pilot"
            export_sample([{"source_id": "a", "store_id": 1, "text": "Comida boa"}], folder, 1, "seed")
            draft = {"status": "PRE_ANOTACAO_IA_NAO_VALIDADA_POR_HUMANO", "predictions_consulted": False,
                     "reviews": [{"id": "P001", "mentions": [["Comida boa", "Comida", "Positivo", "Explicita", "Não", ""]]}]}
            (folder / "rascunho_ia.json").write_text(json.dumps(draft), encoding="utf-8")
            rows = prepare_mentions(read_csv(folder / "01_avaliacoes_CEGO.csv"), draft)
            for row in rows:
                row.update({model: {"sentiment": "Positivo", "score": 0.7} for model in ("bertweet", "bertimbau")})
            report = {"status": "EXPLORATORIO_CONTRA_RASCUNHO_IA_NAO_GABARITO_HUMANO",
                      "input_hashes": {name: sha256(folder / name) for name in ("01_avaliacoes_CEGO.csv", "rascunho_ia.json")}, "mentions": rows}
            path = folder / "report.json"
            path.write_text(json.dumps(report), encoding="utf-8")
            self.assertEqual(len(load_comparison(folder, path)["mentions"]), 1)
            report["mentions"] = []
            path.write_text(json.dumps(report), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_comparison(folder, path)
            report["mentions"] = rows
            path.write_text(json.dumps(report), encoding="utf-8")
            (folder / "rascunho_ia.json").write_text(json.dumps(draft) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Dados alterados"):
                load_comparison(folder, path)


if __name__ == "__main__":
    unittest.main()
