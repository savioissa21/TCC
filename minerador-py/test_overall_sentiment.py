import unittest

from overall_sentiment import (
    DEFAULT_MAX_TOKENS,
    classify_overall_sentiment,
    content_token_limit,
    split_into_token_chunks,
)


class FakeTokenizer:
    """Tokenizador simplificado: cada palavra é um token."""

    def __init__(self, model_max_length=32, special_tokens=2):
        self.model_max_length = model_max_length
        self.special_tokens = special_tokens
        self.vocabulary = {}
        self.words = []

    def num_special_tokens_to_add(self, pair=False):
        return self.special_tokens

    def __call__(self, text, add_special_tokens=False):
        ids = []
        for word in text.split():
            if word not in self.vocabulary:
                self.vocabulary[word] = len(self.words)
                self.words.append(word)
            ids.append(self.vocabulary[word])
        return {"input_ids": ids}

    def decode(self, ids, skip_special_tokens=True):
        return " ".join(self.words[i] for i in ids)


class FakePipeline:
    """Classifica cada texto pela contagem de palavras 'bom' e 'ruim'."""

    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
        self.calls = []

    def _scores(self, text):
        words = text.split()
        positive = words.count("bom") + 0.1
        negative = words.count("ruim") + 0.1
        neutral = 0.1
        total = positive + negative + neutral
        return [
            {"label": "POS", "score": positive / total},
            {"label": "NEG", "score": negative / total},
            {"label": "NEU", "score": neutral / total},
        ]

    def __call__(self, inputs, **kwargs):
        self.calls.append((inputs, kwargs))
        texts = inputs if isinstance(inputs, list) else [inputs]
        all_scores = [self._scores(text) for text in texts]
        if kwargs.get("top_k", "default") is None:
            return all_scores
        return [max(scores, key=lambda item: item["score"]) for scores in all_scores]


def words(*parts):
    return " ".join(parts)


class OverallSentimentTest(unittest.TestCase):
    def test_short_text_keeps_original_single_call(self):
        pipeline = FakePipeline(FakeTokenizer(model_max_length=32))
        text = "o atendimento foi bom e a comida bom"

        result = classify_overall_sentiment(text, pipeline)

        self.assertEqual([(text, {"truncation": True})], pipeline.calls)
        self.assertEqual("POS", result["label"])
        self.assertEqual(1, result["chunks"])

    def test_long_text_is_split_within_model_limit(self):
        tokenizer = FakeTokenizer(model_max_length=32)
        pipeline = FakePipeline(tokenizer)
        text = " ".join(f"palavra{i}" for i in range(100))
        limit = content_token_limit(pipeline)

        chunks = split_into_token_chunks(text, tokenizer, limit)

        self.assertGreater(len(chunks), 1)
        for chunk_text, size in chunks:
            self.assertLessEqual(size, limit)
            self.assertEqual(size, len(chunk_text.split()))
        covered = set(" ".join(chunk for chunk, _ in chunks).split())
        self.assertEqual(set(text.split()), covered)

    def test_consecutive_chunks_overlap(self):
        tokenizer = FakeTokenizer()
        text = " ".join(f"w{i}" for i in range(40))

        chunks = split_into_token_chunks(text, tokenizer, max_content_tokens=10, overlap=3, margin=0)

        first, second = chunks[0][0].split(), chunks[1][0].split()
        self.assertEqual(first[-3:], second[:3])

    def test_negative_ending_of_long_review_is_considered(self):
        # Com corte, só o começo positivo seria lido; dividido, o final negativo pesa.
        pipeline = FakePipeline(FakeTokenizer(model_max_length=32))
        text = words(*(["bom"] * 20), *(["ruim"] * 60))

        result = classify_overall_sentiment(text, pipeline)

        self.assertEqual("NEG", result["label"])
        self.assertGreater(result["chunks"], 1)
        inputs, kwargs = pipeline.calls[-1]
        self.assertIsInstance(inputs, list)
        self.assertEqual({"truncation": True, "top_k": None}, kwargs)

    def test_scores_are_weighted_by_chunk_size(self):
        pipeline = FakePipeline(FakeTokenizer(model_max_length=32))
        text = words(*(["ruim"] * 30), *(["bom"] * 50))

        result = classify_overall_sentiment(text, pipeline)

        self.assertEqual("POS", result["label"])
        self.assertGreater(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_text_that_exactly_fits_is_not_split(self):
        tokenizer = FakeTokenizer(model_max_length=32)
        pipeline = FakePipeline(tokenizer)
        text = " ".join(["bom"] * content_token_limit(pipeline))

        result = classify_overall_sentiment(text, pipeline)

        self.assertEqual(1, result["chunks"])
        self.assertEqual([(text, {"truncation": True})], pipeline.calls)

    def test_unset_tokenizer_limit_falls_back_to_default(self):
        pipeline = FakePipeline(FakeTokenizer(model_max_length=int(1e30)))
        self.assertEqual(DEFAULT_MAX_TOKENS - 2, content_token_limit(pipeline))

    def test_incomplete_model_output_is_rejected(self):
        tokenizer = FakeTokenizer(model_max_length=32)
        inner = FakePipeline(tokenizer)

        class BrokenPipeline:
            def __init__(self):
                self.tokenizer = tokenizer

            def __call__(self, inputs, **kwargs):
                result = inner(inputs, **kwargs)
                return result[:-1] if isinstance(inputs, list) else result

        with self.assertRaises(RuntimeError):
            classify_overall_sentiment(" ".join(["bom"] * 100), BrokenPipeline())


if __name__ == "__main__":
    unittest.main()
