"""Teste rápido do modelo BERTimbau ABSA treinado."""

from __future__ import annotations

import argparse

from bertimbau_absa import AspectSentimentAnalyzer, DEFAULT_MODEL_DIR


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=str(DEFAULT_MODEL_DIR))
    parser.add_argument(
        "--text",
        default="A pizza é ótima, mas o atendimento foi péssimo e o preço é alto.",
    )
    parser.add_argument(
        "--aspects",
        nargs="+",
        default=["Comida", "Atendimento", "Preço", "Ambiente"],
    )
    parser.add_argument(
        "--targets",
        nargs="+",
        default=["pizza", "atendimento", "preço", "ambiente"],
    )
    args = parser.parse_args()

    if len(args.aspects) != len(args.targets):
        parser.error("--aspects e --targets precisam ter o mesmo tamanho")
    analyzer = AspectSentimentAnalyzer(args.model)
    predictions = analyzer.predict_many(
        (args.text, aspect, target)
        for aspect, target in zip(args.aspects, args.targets)
    )
    print(args.text)
    for aspect, prediction in zip(args.aspects, predictions):
        print(f"- {aspect}: {prediction['sentiment']} ({prediction['score']:.1%})")


if __name__ == "__main__":
    main()
