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

    def test_nonexperience_is_excluded_not_neutral(self):
        for text in ["Não cheguei a experimentar a comida.", "Não experimentei a comida",
                     "Ainda não provei a pizza.", "Eu não comi o pastel ainda.",
                     "Não experimentamos as bebidas da casa.", "Nunca provei a sobremesa.",
                     "Não cheguei a provar a comida e a bebida."]:
            with self.subTest(text=text):
                self.assertEqual(extract_aspect_candidates(text), [])

    def test_nonexperience_keeps_other_aspects_and_consumed_products(self):
        for text in ["Não experimentei a comida, mas o atendimento foi ótimo.",
                     "Não experimentei a comida e o atendimento foi ótimo.",
                     "Não experimentei a comida, atendimento ótimo."]:
            with self.subTest(text=text):
                candidates = extract_aspect_candidates(text)
                self.assertEqual([c["name"] for c in candidates], ["Atendimento"])
                self.assertNotIn("experimentei", candidates[0]["excerpt"])
        candidates = extract_aspect_candidates("Não provei a comida, mas a bebida estava ótima.")
        self.assertEqual([c["name"] for c in candidates], ["Comida"])
        self.assertEqual(candidates[0]["excerpt"], "a bebida estava ótima")
        text = "Não experimentei a comida e o ambiente estava ótimo, atendimento excelente."
        candidates = extract_aspect_candidates(text)
        self.assertEqual([c["name"] for c in candidates], ["Ambiente", "Atendimento"])
        self.assertTrue(all(c["excerpt"] in text for c in candidates))

    def test_real_opinions_and_unavailability_are_not_removed(self):
        for text in ["Não gostei da comida.", "Não tinham a bebida que eu queria.",
                     "Nunca comi uma pizza tão boa.", "Não comi a pizza porque estava queimada.",
                     "Não provei a comida, que parecia estragada.", "Não deixei de provar a comida.",
                     "Não comi a pizza e estava queimada.",
                     "Não experimentei a pizza cara."]:
            with self.subTest(text=text):
                self.assertIn("Comida", aspect_names(text))


    def test_other_restaurant_types_are_covered(self):
        cases = {
            "O sushi estava fresco e o temaki bem servido.": ["Comida"],
            "A picanha veio no ponto certo e o churrasco estava ótimo.": ["Comida"],
            "Hambúrguer suculento e batata frita crocante.": ["Comida"],
            "O açaí é muito bom.": ["Comida"],
            "Café quentinho e pão de queijo delicioso.": ["Comida"],
            "Fomos muito bem atendidos.": ["Atendimento"],
            "Pessoal simpático e prestativo.": ["Atendimento"],
            "Estacionamento pequeno e o ar condicionado não funcionava.": ["Ambiente"],
            "Banheiro sujo.": ["Ambiente"],
            "Paguei 120 reais por pessoa.": ["Preço"],
            "Cobraram couvert sem avisar.": ["Preço"],
            "Ótimo custo-benefício.": ["Preço"],
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(aspect_names(text), expected)

    def test_slang_and_generic_words_do_not_create_aspects(self):
        cases = {
            "O cara do caixa foi grosso.": ["Atendimento"],
            "O lugar é massa, recomendo.": [],
            "Dou muito valor a um bom atendimento.": ["Atendimento"],
            "A borda grossa estava perfeita.": ["Comida"],
            "Deixei o carro limpo na rua.": [],
            "A falta de educação do público é absurda.": [],
            "O garçom não teve educação.": ["Atendimento"],
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(aspect_names(text), expected)

    def test_ambiguous_price_and_food_words_with_context(self):
        self.assertEqual(aspect_names("A pizza é cara."), ["Comida", "Preço"])
        self.assertEqual(aspect_names("A massa estava crua."), ["Comida"])
        self.assertEqual(aspect_names("Valor justo pelo que oferecem."), ["Preço"])
        self.assertEqual(aspect_names("O pedido veio errado."), ["Atendimento"])

    def test_nonexperience_covers_new_products(self):
        self.assertEqual(extract_aspect_candidates("Não provei o sushi."), [])
        candidates = extract_aspect_candidates("Não experimentei a picanha, mas o atendimento foi ótimo.")
        self.assertEqual([c["name"] for c in candidates], ["Atendimento"])

if __name__ == "__main__":
    unittest.main()
