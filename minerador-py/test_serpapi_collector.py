import json
import traceback
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError

from serpapi_collector import (
    SerpApiCollector,
    SerpApiCollectorError,
    expand_google_maps_url,
    extract_place_reference,
    known_review_ids_from_env,
)


DATA_ID = "0x94a76372804ee625:0x9b25daaefa71e5f6"
MAPS_URL = f"https://www.google.com/maps/place/Loja/data=!4m5!3m4!1s{DATA_ID}!8m2!3d-17!4d-48"


def raw_review(index, source="Google"):
    return {
        "review_id": f"review-{index}",
        "rating": 5,
        "date": "há uma semana",
        "iso_date": "2026-10-01T00:00:00Z",
        "source": source,
        "user": {"name": f"Cliente {index}"},
        "snippet": f"Comentário completo {index}",
    }


class FakeResponse:
    def __init__(self, url):
        self.url = url
        self.closed = False

    def geturl(self):
        return self.url

    def close(self):
        self.closed = True


class SerpApiCollectorTest(unittest.TestCase):
    def test_extracts_data_id_and_place_id(self):
        self.assertEqual(extract_place_reference(MAPS_URL), ("data_id", DATA_ID))
        self.assertEqual(
            extract_place_reference("https://www.google.com/maps?q=place_id:ChIJabc_123"),
            ("place_id", "ChIJabc_123"),
        )

    def test_expands_short_url_and_rejects_non_google_destination(self):
        response = FakeResponse(MAPS_URL)
        self.assertEqual(
            expand_google_maps_url(
                "https://maps.app.goo.gl/example",
                opener=lambda *_args, **_kwargs: response,
            ),
            MAPS_URL,
        )
        self.assertTrue(response.closed)
        with self.assertRaisesRegex(SerpApiCollectorError, "não redirecionou"):
            expand_google_maps_url(
                "https://maps.app.goo.gl/example",
                opener=lambda *_args, **_kwargs: FakeResponse("https://example.com/store"),
            )

    def test_collects_one_hundred_with_token_pagination(self):
        calls = []
        batches = [list(range(8))] + [list(range(i, i + 20)) for i in range(8, 108, 20)]

        def request(params):
            calls.append(params)
            batch = batches[len(calls) - 1]
            payload = {
                "search_metadata": {"status": "Success"},
                "reviews": [raw_review(i) for i in batch],
                "place_info": {"reviews": 748},
            }
            if len(calls) < len(batches):
                payload["serpapi_pagination"] = {"next_page_token": f"token-{len(calls)}"}
            return payload

        result = SerpApiCollector("secret", request_json=request).collect(MAPS_URL, 100)
        self.assertEqual(len(result.reviews), 100)
        self.assertEqual(result.pages, 6)
        self.assertEqual(result.warnings, [])
        self.assertNotIn("num", calls[0])
        self.assertEqual(calls[1]["num"], 20)
        self.assertEqual(calls[-1]["num"], 12)
        self.assertTrue(all(call["sort_by"] == "newestFirst" for call in calls))

    def test_stops_incremental_collection_at_first_known_review(self):
        request = Mock(return_value={
            "search_metadata": {"status": "Success"},
            "place_info": {"reviews": 500},
            "reviews": [raw_review(10), raw_review(11), raw_review(12)],
            "serpapi_pagination": {"next_page_token": "unused"},
        })
        result = SerpApiCollector("secret", request_json=request).collect(
            MAPS_URL, 100, known_review_ids={"review-11"}
        )
        self.assertEqual([item["review_id"] for item in result.reviews], ["review-10", "review-11"])
        self.assertTrue(result.stopped_on_known)
        self.assertEqual(result.warnings, [])
        request.assert_called_once()

    def test_marks_missing_pagination_as_partial(self):
        request = Mock(return_value={
            "search_metadata": {"status": "Success"},
            "place_info": {"reviews": 200},
            "reviews": [raw_review(i) for i in range(8)],
        })
        result = SerpApiCollector("secret", request_json=request).collect(MAPS_URL, 100)
        self.assertEqual(result.warnings, ["TARGET_NOT_REACHED"])

    def test_does_not_mark_complete_small_store_as_partial(self):
        request = Mock(return_value={
            "search_metadata": {"status": "Success"},
            "place_info": {"reviews": 3},
            "reviews": [raw_review(i) for i in range(3)],
        })
        result = SerpApiCollector("secret", request_json=request).collect(MAPS_URL, 100)
        self.assertEqual(len(result.reviews), 3)
        self.assertEqual(result.warnings, [])

    def test_uses_original_text_and_ignores_aggregated_external_reviews(self):
        translated = raw_review(1)
        translated["snippet"] = "Texto traduzido"
        translated["extracted_snippet"] = {"original": "Texto original", "translated": "Translated"}
        request = Mock(return_value={
            "search_metadata": {"status": "Success"},
            "place_info": {"reviews": 2},
            "reviews": [translated, raw_review(2, source="Trip.com")],
        })
        result = SerpApiCollector("secret", request_json=request).collect(MAPS_URL, 100)
        self.assertEqual(result.reviews[0]["text"], "Texto original")
        self.assertEqual(result.warnings, ["NON_GOOGLE_REVIEWS_SKIPPED", "TARGET_NOT_REACHED"])

    def test_resolves_named_place_with_one_lookup_when_url_has_no_id(self):
        calls = []

        def request(params):
            calls.append(params)
            if params["engine"] == "google_maps":
                return {
                    "search_metadata": {"status": "Success"},
                    "place_results": {"title": "Pastel da vó", "data_id": DATA_ID},
                }
            return {
                "search_metadata": {"status": "Success"},
                "place_info": {"reviews": 1},
                "reviews": [raw_review(1)],
            }

        url = "https://www.google.com/maps/place/Pastel+da+v%C3%B3/@-17.2,-48.2,17z"
        result = SerpApiCollector("secret", request_json=request).collect(url, 100)
        self.assertEqual(len(result.reviews), 1)
        self.assertEqual(calls[0]["q"], "Pastel da vó")
        self.assertEqual(calls[0]["ll"], "@-17.2,-48.2,15z")
        self.assertEqual(calls[1]["data_id"], DATA_ID)

    def test_reports_configuration_and_quota_errors_without_exposing_key(self):
        with self.assertRaisesRegex(SerpApiCollectorError, "SERPAPI_API_KEY"):
            SerpApiCollector(" ")
        collector = SerpApiCollector(
            "top-secret",
            request_json=lambda _params: {"error": "Your account has run out of searches."},
        )
        with self.assertRaisesRegex(SerpApiCollectorError, "cota") as context:
            collector.collect(MAPS_URL)
        self.assertNotIn("top-secret", str(context.exception))

    def test_http_error_traceback_does_not_expose_api_key(self):
        secret = "top-secret-that-must-not-leak"
        unsafe_url = f"https://serpapi.com/search.json?api_key={secret}"
        http_error = HTTPError(unsafe_url, 401, "Unauthorized", {}, None)
        collector = SerpApiCollector(secret, retries=1)

        with patch("serpapi_collector.urlopen", side_effect=http_error):
            with self.assertRaises(SerpApiCollectorError) as context:
                collector.collect(MAPS_URL)

        rendered = "".join(traceback.format_exception(context.exception))
        self.assertNotIn(secret, rendered)
        self.assertIsNone(context.exception.__cause__)

    def test_validates_known_ids_json(self):
        self.assertEqual(known_review_ids_from_env(json.dumps(["a", " b ", ""])), {"a", "b"})
        with self.assertRaises(SerpApiCollectorError):
            known_review_ids_from_env("not-json")


if __name__ == "__main__":
    unittest.main()
