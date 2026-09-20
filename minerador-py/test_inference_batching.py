import unittest
from unittest.mock import Mock, patch

from aspect_analysis import analyze_aspects_with


class InferenceBatchingTest(unittest.TestCase):
    CANDIDATES = [
        {"name": "Ambiente", "target": "ambiente", "excerpt": "Ambiente bonito."},
        {"name": "Comida", "target": "comida", "excerpt": "Comida sem sabor."},
    ]

    def test_batches_all_mentions_from_one_review(self):
        analyzer = Mock()
        analyzer.predict_many.return_value = [
            {"sentiment": "Positivo"},
            {"sentiment": "Negativo"},
        ]
        with patch("aspect_analysis.extract_aspect_candidates", return_value=self.CANDIDATES):
            result = analyze_aspects_with("avaliação", analyzer)

        analyzer.predict_many.assert_called_once_with(
            [
                ("Ambiente bonito.", "Ambiente", "ambiente"),
                ("Comida sem sabor.", "Comida", "comida"),
            ]
        )
        analyzer.predict.assert_not_called()
        self.assertEqual(["Positivo", "Negativo"], [item["sentiment"] for item in result])

    def test_no_candidates_does_not_load_or_call_model(self):
        analyzer = Mock()
        with patch("aspect_analysis.extract_aspect_candidates", return_value=[]):
            self.assertEqual([], analyze_aspects_with("sem aspecto", analyzer))
        analyzer.predict_many.assert_not_called()

    def test_incomplete_model_batch_is_rejected(self):
        analyzer = Mock()
        analyzer.predict_many.return_value = [{"sentiment": "Positivo"}]
        with patch("aspect_analysis.extract_aspect_candidates", return_value=self.CANDIDATES):
            with self.assertRaises(ValueError):
                analyze_aspects_with("avaliação", analyzer)


if __name__ == "__main__":
    unittest.main()
