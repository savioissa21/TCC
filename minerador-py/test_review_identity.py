import hashlib
import unittest

from review_identity import review_identity


class ReviewIdentityTest(unittest.TestCase):
    def test_preserves_original_google_id_and_existing_hash(self):
        identity = review_identity("google-1", "Ana", 5.0, "Bom")
        self.assertEqual(identity["googleReviewId"], "google-1")
        self.assertEqual(identity["id"], hashlib.sha256(b"google-1").hexdigest())

    def test_distinct_ids_preserve_identical_reviews(self):
        first = review_identity("google-1", "Ana", 5.0, "Bom")
        second = review_identity("google-2", "Ana", 5.0, "Bom")
        self.assertNotEqual(first["id"], second["id"])

    def test_same_google_id_survives_content_edits(self):
        self.assertEqual(
            review_identity("google-1", "Ana", 5.0, "Bom"),
            review_identity("google-1", "Outro nome", 1.0, "Texto editado"),
        )

    def test_missing_id_keeps_legacy_fingerprint_hash_without_claiming_google_id(self):
        identity = review_identity(None, " Ana ", 5.0, "  Muito   BOM ")
        self.assertIsNone(identity["googleReviewId"])
        self.assertEqual(identity["id"], hashlib.sha256(b"ana|5.0|muito bom").hexdigest())
        self.assertEqual(identity, review_identity("  ", "Ana", 5.0, "Muito bom"))

    def test_trims_original_id(self):
        self.assertEqual(
            review_identity(" google-1 ", "Ana", 5.0, "Bom"),
            review_identity("google-1", "Ana", 5.0, "Bom"),
        )


if __name__ == "__main__":
    unittest.main()
