from __future__ import annotations

import unittest

from aspect_extractor import contains_term, extract_aspect_candidates


def aspect_names(text: str) -> list[str]:
    return [candidate["name"] for candidate in extract_aspect_candidates(text)]


class AspectExtractorTest(unittest.TestCase):
    def test_service_at_table_does_not_create_environment(self) -> None:
        text = "O atendimento da mocinha deixou a desejar no início do atendimento na mesa."

        self.assertEqual(aspect_names(text), ["Atendimento"])

    def test_dirty_tables_create_environment(self) -> None:
        text = "As mesas estavam sujas e as cadeiras eram desconfortáveis."

        self.assertEqual(aspect_names(text), ["Ambiente"])

    def test_mixed_review_keeps_each_polarity_clause_separate(self) -> None:
        text = "A comida estava ótima, mas o atendimento demorou muito."
        candidates = extract_aspect_candidates(text)

        self.assertEqual([item["name"] for item in candidates], ["Comida", "Atendimento"])
        self.assertEqual(candidates[0]["excerpt"], "A comida estava ótima")
        self.assertEqual(candidates[1]["excerpt"], "o atendimento demorou muito")

    def test_food_and_price_can_exist_in_the_same_clause(self) -> None:
        text = "Pastel gostoso e barato."

        self.assertEqual(aspect_names(text), ["Comida", "Preço"])

    def test_text_without_project_aspect_returns_empty(self) -> None:
        self.assertEqual(aspect_names("Fui ontem com a minha família."), [])

    def test_ambiguous_local_requires_environment_context(self) -> None:
        self.assertEqual(aspect_names("Passei no local e pedi um pastel."), ["Comida"])
        self.assertEqual(aspect_names("Local agradável e climatizado."), ["Ambiente"])

    def test_only_one_candidate_per_aspect_and_clause(self) -> None:
        candidates = extract_aspect_candidates("Comida saborosa, com massa e muito recheio.")

        self.assertEqual(aspect_names("Comida saborosa, com massa e muito recheio."), ["Comida"])
        self.assertEqual(candidates[0]["target"], "comida")

    def test_word_matching_does_not_use_substrings(self) -> None:
        self.assertTrue(contains_term("O preço está bom", "preço"))
        self.assertFalse(contains_term("A Carol foi atendida", "caro"))


if __name__ == "__main__":
    unittest.main()
