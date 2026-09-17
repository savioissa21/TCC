import unittest
from types import SimpleNamespace
from dataset_integrity import assert_disjoint_splits


class IntegrityTests(unittest.TestCase):
    def test_same_review_with_different_aspects_cannot_cross_splits(self):
        with self.assertRaisesRegex(ValueError, "Dataset leakage"):
            assert_disjoint_splits({"train": [SimpleNamespace(text="Comida ÓTIMA")],
                                   "test": [SimpleNamespace(text=" comida ótima ")]})

    def test_multiple_aspects_within_one_split_are_allowed(self):
        assert_disjoint_splits({"train": [SimpleNamespace(text="boa"), SimpleNamespace(text="boa")],
                               "test": [SimpleNamespace(text="ruim")]})
