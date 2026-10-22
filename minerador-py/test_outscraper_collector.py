import json
import traceback
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from outscraper_collector import (
    OutscraperCollector,
    OutscraperCollectorError,
)


MAPS_URL = "https://maps.app.goo.gl/example"


def raw_review(index):
    return {
        "review_id": f"review-{index}",
        "autor_name": f"Cliente {index}",
        "autor_id": f"author-{index}",
        "review_text": f"Comentário completo {index}",
        "review_rating": 5,
        "review_timestamp": 1760000000 + index,
    }


def response(reviews, total=None):
    return {
        "status": "Success",
        "data": [[{
            "name": "Loja",
            "google_id": "0x123:0x456",
            "reviews": len(reviews) if total is None else total,
            "reviews_data": reviews,
        }]],
    }


class OutscraperCollectorTest(unittest.TestCase):
    def test_requests_one_place_and_one_hundred_newest_reviews(self):
        calls = []

        def request(params):
            calls.append(params)
            return response([raw_review(i) for i in range(100)], total=900)

        result = OutscraperCollector("secret", request_json=request).collect(MAPS_URL, 100)
        self.assertEqual(len(result.reviews), 100)
        self.assertEqual(result.warnings, [])
        self.assertEqual(calls, [{
            "query": MAPS_URL,
            "reviewsLimit": 100,
            "limit": 1,
            "sort": "newest",
            "language": "pt",
            "region": "BR",
            "async": "false",
        }])

    def test_normalizes_outscraper_fields_and_generates_stable_id(self):
        review = raw_review(1)
        review.pop("review_id")
        collector = OutscraperCollector("secret", request_json=lambda _params: response([review]))
        first = collector.collect(MAPS_URL, 1).reviews[0]
        second = collector.collect(MAPS_URL, 1).reviews[0]
        self.assertEqual(first["review_id"], second["review_id"])
        self.assertTrue(first["review_id"].startswith("outscraper:"))
        self.assertEqual(first["author"], "Cliente 1")
        self.assertEqual(first["text"], "Comentário completo 1")
        self.assertEqual(first["rating"], 5.0)
        self.assertTrue(first["date"].endswith("+00:00"))

    def test_stops_at_first_known_review(self):
        collector = OutscraperCollector(
            "secret",
            request_json=lambda _params: response(
                [raw_review(10), raw_review(11), raw_review(12)], total=500
            ),
        )
        result = collector.collect(MAPS_URL, 100, known_review_ids={"review-11"})
        self.assertEqual([item["review_id"] for item in result.reviews], ["review-10", "review-11"])
        self.assertTrue(result.stopped_on_known)
        self.assertEqual(result.warnings, [])

    def test_marks_truncated_response_as_partial(self):
        collector = OutscraperCollector(
            "secret", request_json=lambda _params: response([raw_review(1)], total=200)
        )
        result = collector.collect(MAPS_URL, 100)
        self.assertEqual(result.warnings, ["TARGET_NOT_REACHED"])

    def test_does_not_mark_complete_small_store_as_partial(self):
        collector = OutscraperCollector(
            "secret", request_json=lambda _params: response([raw_review(1)], total=1)
        )
        result = collector.collect(MAPS_URL, 100)
        self.assertEqual(result.warnings, [])

    def test_rejects_invalid_configuration_and_target(self):
        with self.assertRaisesRegex(OutscraperCollectorError, "OUTSCRAPER_API_KEY"):
            OutscraperCollector(" ")
        collector = OutscraperCollector("secret", request_json=lambda _params: response([]))
        with self.assertRaises(ValueError):
            collector.collect(MAPS_URL, 501)

    def test_http_error_traceback_does_not_expose_api_key(self):
        secret = "top-secret-that-must-not-leak"
        error = HTTPError("https://api.outscraper.cloud", 401, "Unauthorized", {}, None)
        collector = OutscraperCollector(secret)
        with patch("outscraper_collector.urlopen", side_effect=error):
            with self.assertRaises(OutscraperCollectorError) as context:
                collector.collect(MAPS_URL)
        rendered = "".join(traceback.format_exception(context.exception))
        self.assertNotIn(secret, rendered)
        self.assertIsNone(context.exception.__cause__)

    def test_skips_malformed_and_duplicate_reviews(self):
        duplicate = raw_review(1)
        collector = OutscraperCollector(
            "secret",
            request_json=lambda _params: response(
                [duplicate, dict(duplicate), {"review_rating": "invalid"}], total=1
            ),
        )
        result = collector.collect(MAPS_URL, 100)
        self.assertEqual(len(result.reviews), 1)
        self.assertEqual(result.warnings, ["MALFORMED_REVIEW_SKIPPED"])


if __name__ == "__main__":
    unittest.main()
