import unittest
from unittest.mock import Mock
from inference_batch import analyze_reviews


class BatchTests(unittest.TestCase):
    def review(self, text, rating=4):
        return dict(review_id="synthetic", author="Pessoa fictícia", text=text, rating=rating, date="hoje")

    def test_batches_all_candidates_and_preserves_long_text(self):
        texts = ["A pizza é ótima, mas o atendimento não foi bom. O preço é alto e o ambiente agradável.",
                 "A comida não é ruim. " * 400]
        general = Mock(return_value=[dict(label="POS", score=.7), dict(label="NEU", score=.6)])
        absa = Mock()
        absa.predict_many.side_effect = lambda pairs, **_: [dict(sentiment="Negativo" if p[1] in ("Preço", "Atendimento") else "Positivo") for p in pairs]
        result = analyze_reviews([self.review(t) for t in texts], general, absa)
        self.assertEqual(result[1]["text"], texts[1])
        general.assert_called_once_with(texts, truncation=True, batch_size=16)
        absa.predict_many.assert_called_once()
        self.assertEqual({a["name"] for a in result[0]["aspects"]}, {"Comida", "Atendimento", "Preço", "Ambiente"})
        self.assertEqual({a["sentiment"] for a in result[0]["aspects"]}, {"Positivo", "Negativo"})

    def test_star_only_never_calls_models(self):
        general, absa = Mock(), Mock()
        result = analyze_reviews([self.review("", 3)], general, absa)
        self.assertEqual(result[0]["aspects"], [])
        self.assertEqual(result[0]["overallSentiment"], "Neutro")
        general.assert_not_called()
        absa.predict_many.assert_not_called()

    def test_model_failure_aborts_entire_result(self):
        general = Mock(return_value=[dict(label="POS", score=.9)])
        absa = Mock()
        absa.predict_many.side_effect = RuntimeError("model failed")
        with self.assertRaisesRegex(RuntimeError, "model failed"):
            analyze_reviews([self.review("Comida boa")], general, absa)

    def test_incomplete_predictions_are_not_silently_dropped(self):
        with self.assertRaisesRegex(ValueError, "Incomplete general"):
            analyze_reviews([self.review("Comida boa")], Mock(return_value=[]), Mock())
        absa = Mock()
        absa.predict_many.return_value = []
        with self.assertRaisesRegex(ValueError, "Incomplete aspect"):
            analyze_reviews([self.review("Comida boa")], Mock(return_value=[dict(label="POS", score=.9)]), absa)
