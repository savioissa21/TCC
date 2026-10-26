import json
import traceback
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from apify_collector import ApifyCollector, ApifyCollectorError


MAPS_URL = "https://www.google.com/maps/place/Loja/data=!4m5!3m4!1s0x123:0x456"
SHORT_URL = "https://maps.app.goo.gl/example"


class FakeResponse:
    def __init__(self, url):
        self.url = url
        self.closed = False

    def geturl(self):
        return self.url

    def close(self):
        self.closed = True


def raw_review(index, *, origin="Google"):
    return {
        "reviewId": f"review-{index}",
        "reviewUrl": f"https://www.google.com/maps/reviews/{index}",
        "name": f"Cliente {index}",
        "text": f"Comentário completo {index}",
        "stars": 5,
        "publishedAtDate": f"2026-10-{index + 1:02d}T12:00:00.000Z",
        "reviewOrigin": origin,
        "reviewsCount": 900,
        "totalScore": 4.7,
        "placeId": "ChIJexample",
    }


class ApifyCollectorTest(unittest.TestCase):
    def collector(self, request_json, **kwargs):
        return ApifyCollector(
            "secret",
            request_json=request_json,
            short_url_opener=lambda *_args, **_kwargs: FakeResponse(MAPS_URL),
            **kwargs,
        )

    def test_requests_one_hundred_newest_google_reviews(self):
        calls = []

        def request(actor_input, target):
            calls.append((actor_input, target))
            return [raw_review(index) for index in range(300)]

        result = self.collector(request).collect(SHORT_URL, 100)

        self.assertEqual(len(result.reviews), 100)
        self.assertEqual(result.warnings, [])
        self.assertEqual(calls, [({
            "startUrls": [{"url": MAPS_URL}],
            "maxReviews": 300,
            "reviewsSort": "newest",
            "reviewsOrigin": "google",
            "language": "pt-BR",
            "personalData": True,
        }, 300)])
        self.assertEqual(result.google_rating, 4.7)
        self.assertEqual(result.google_review_count, 900)
        self.assertEqual(result.skipped_without_text, 0)
        self.assertEqual(result.raw_reviews_requested, 300)

    def test_normalizes_documented_output_fields(self):
        result = self.collector(lambda _input, _target: [raw_review(1)]).collect(
            SHORT_URL, 1
        )
        review = result.reviews[0]
        self.assertEqual(review["review_id"], "review-1")
        self.assertEqual(review["author"], "Cliente 1")
        self.assertEqual(review["text"], "Comentário completo 1")
        self.assertEqual(review["rating"], 5.0)
        self.assertEqual(review["date"], "2026-10-02T12:00:00.000Z")

    def test_generates_stable_fallback_id(self):
        raw = raw_review(1)
        raw.pop("reviewId")
        raw.pop("reviewUrl")
        collector = self.collector(lambda _input, _target: [raw])
        first = collector.collect(SHORT_URL, 1).reviews[0]["review_id"]
        second = collector.collect(SHORT_URL, 1).reviews[0]["review_id"]
        self.assertEqual(first, second)
        self.assertTrue(first.startswith("apify:"))

    def test_skips_known_reviews_and_continues_backfill(self):
        payload = [raw_review(10), raw_review(11), raw_review(12)]
        for review in payload:
            review["reviewsCount"] = 3
        collector = self.collector(lambda _input, _target: payload)
        result = collector.collect(
            SHORT_URL, 100, known_review_ids={"review-11"}
        )
        self.assertEqual(
            [review["review_id"] for review in result.reviews],
            ["review-10", "review-12"],
        )
        self.assertEqual(result.known_reviews_skipped, 1)
        self.assertEqual(result.warnings, [])

    def test_ignores_star_only_reviews_and_keeps_google_aggregates(self):
        without_text = raw_review(1)
        without_text["text"] = "   "
        result = self.collector(
            lambda _input, _target: [without_text] + [raw_review(index) for index in range(2, 7)]
        ).collect(SHORT_URL, 2)

        self.assertEqual(
            [review["review_id"] for review in result.reviews],
            ["review-2", "review-3"],
        )
        self.assertEqual(result.skipped_without_text, 1)
        self.assertEqual(result.google_rating, 4.7)
        self.assertEqual(result.google_review_count, 900)
        self.assertEqual(result.warnings, [])

    def test_known_star_only_review_is_ignored_without_stopping_backfill(self):
        without_text = raw_review(2)
        without_text["text"] = None
        payload = [raw_review(1), without_text, raw_review(3)]
        for review in payload:
            review["reviewsCount"] = 3
        result = self.collector(lambda _input, _target: payload).collect(
            SHORT_URL, 100, known_review_ids={"review-2"}
        )

        self.assertEqual(
            [review["review_id"] for review in result.reviews],
            ["review-1", "review-3"],
        )
        self.assertEqual(result.skipped_without_text, 1)
        self.assertEqual(result.known_reviews_skipped, 1)
        self.assertEqual(result.warnings, [])

    def test_marks_partial_response_and_skips_external_reviews(self):
        external = raw_review(2, origin="Tripadvisor")
        result = self.collector(
            lambda _input, _target: [raw_review(1), external]
        ).collect(SHORT_URL, 100)
        self.assertEqual(len(result.reviews), 1)
        self.assertEqual(
            result.warnings,
            ["NON_GOOGLE_REVIEWS_SKIPPED", "TARGET_NOT_REACHED"],
        )

    def test_does_not_mark_a_small_store_as_partial(self):
        review = raw_review(1)
        review["reviewsCount"] = 1
        result = self.collector(lambda _input, _target: [review]).collect(
            SHORT_URL, 100
        )
        self.assertEqual(result.warnings, [])

    def test_skips_duplicates_and_malformed_items(self):
        duplicate = raw_review(1)
        duplicate["reviewsCount"] = 1
        result = self.collector(
            lambda _input, _target: [
                duplicate,
                dict(duplicate),
                {"stars": "invalid"},
                "invalid",
            ]
        ).collect(SHORT_URL, 100)
        self.assertEqual(len(result.reviews), 1)
        self.assertEqual(result.warnings, ["MALFORMED_REVIEW_SKIPPED"])

    def test_rejects_missing_token_and_unsafe_targets(self):
        with self.assertRaisesRegex(ApifyCollectorError, "APIFY_API_TOKEN"):
            ApifyCollector(" ")
        collector = self.collector(lambda _input, _target: [])
        with self.assertRaises(ValueError):
            collector.collect(SHORT_URL, 501)

    def test_http_request_uses_header_and_spending_cap(self):
        response = unittest.mock.MagicMock()
        response.read.return_value = json.dumps([raw_review(1)]).encode("utf-8")
        response.__enter__.return_value = response
        captured = {}

        def open_request(request, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return response

        collector = ApifyCollector(
            "top-secret",
            timeout=120,
            max_total_charge_usd=0.5,
            short_url_opener=lambda *_args, **_kwargs: FakeResponse(MAPS_URL),
        )
        with patch("apify_collector.urlopen", side_effect=open_request):
            collector.collect(SHORT_URL, 100)

        request = captured["request"]
        self.assertNotIn("top-secret", request.full_url)
        self.assertEqual(request.get_header("Authorization"), "Bearer top-secret")
        self.assertIn("maxTotalChargeUsd=0.5", request.full_url)
        self.assertIn("maxItems=300", request.full_url)
        self.assertEqual(captured["timeout"], 135)

    def test_http_error_traceback_does_not_expose_token(self):
        secret = "top-secret-that-must-not-leak"
        error = HTTPError("https://api.apify.com", 401, "Unauthorized", {}, None)
        collector = ApifyCollector(
            secret,
            short_url_opener=lambda *_args, **_kwargs: FakeResponse(MAPS_URL),
        )
        with patch("apify_collector.urlopen", side_effect=error):
            with self.assertRaises(ApifyCollectorError) as context:
                collector.collect(SHORT_URL)
        rendered = "".join(traceback.format_exception(context.exception))
        self.assertNotIn(secret, rendered)
        self.assertIsNone(context.exception.__cause__)


if __name__ == "__main__":
    unittest.main()
