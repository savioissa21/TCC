"""Manual real-model benchmark. Requires official checkpoint and checksum.

Run in the Linux production image for native-process peak RSS evidence.
Synthetic cases check plumbing and expose predictions; they are not a test corpus.
"""
import json
import os
import platform
import time
from pathlib import Path


def main():
    started = time.perf_counter()
    from absa_model_validation import require_absa_model, DEFAULT_MODEL_DIR
    from bertimbau_absa import AspectSentimentAnalyzer
    from transformers import pipeline
    from inference_batch import analyze_reviews
    model_path = Path(os.getenv("ABSA_MODEL_PATH", str(DEFAULT_MODEL_DIR)))
    digest = os.environ["ABSA_MODEL_SHA256"]
    require_absa_model(model_path, digest, require_checksum=True)
    absa = AspectSentimentAnalyzer(model_path)
    general = pipeline("sentiment-analysis", model="pysentimiento/bertweet-pt-sentiment")
    initialization = time.perf_counter() - started
    examples = ["A pizza é ótima, mas o atendimento foi péssimo. O ambiente é agradável e o preço é alto.",
                "O atendimento não foi bom. A comida não estava ruim.",
                "O ambiente é agradável. " * 400, ""]
    reviews = [dict(review_id=f"synthetic-{i}", author="Pessoa fictícia", text=examples[i % 4],
                    rating=3, date="teste") for i in range(100)]
    started = time.perf_counter()
    result = analyze_reviews(reviews, general, absa)
    report = {"checkpoint_sha256": digest, "platform": platform.platform(), "python": platform.python_version(),
              "device": str(absa.device), "initialization_seconds": initialization,
              "seconds_per_100_reviews": time.perf_counter() - started,
              "predictions_first_four": result[:4], "note": "Synthetic performance/regression evidence, not scientific accuracy."}
    try:
        import resource
        report["peak_rss_kib"] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    except ImportError:
        report["peak_rss_kib"] = None
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
