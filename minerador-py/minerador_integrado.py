import sys
import asyncio
import json
import os
from pathlib import Path
from transformers import pipeline

from review_identity import review_identity
from maps_collector import prepare_reviews, collect_reviews
from serpapi_collector import collect_reviews_from_serpapi
from apify_collector import collect_reviews_from_apify
from aspect_analysis import analyze_aspects_with
from absa_model_validation import (
    AbsaModelError,
    DEFAULT_MODEL_DIR,
    require_absa_model,
)
from bertimbau_absa import AspectSentimentAnalyzer

TARGET_URL = sys.argv[1] if len(sys.argv) >= 2 else None
OUTPUT_FILE = os.getenv('MINING_OUTPUT_FILE', 'dados_temp.json')
TARGET_REVIEWS = int(os.getenv('TARGET_REVIEWS', '100'))
COLLECTOR_PROVIDER = os.getenv('REVIEW_COLLECTOR_PROVIDER', 'serpapi').strip().casefold()


sentiment_pipeline = None
aspect_sentiment_analyzer = None

configured_absa_model_path = os.getenv("ABSA_MODEL_PATH")
ABSA_MODEL_PATH = (
    Path(configured_absa_model_path) if configured_absa_model_path else DEFAULT_MODEL_DIR
)
ABSA_MODEL_SHA256 = os.getenv("ABSA_MODEL_SHA256")

def get_sentiment_pipeline():
    global sentiment_pipeline
    if sentiment_pipeline is None:
        print("[IA] Carregando modelo de analise de sentimentos...", flush=True)
        sentiment_pipeline = pipeline("sentiment-analysis", model="pysentimiento/bertweet-pt-sentiment")
    return sentiment_pipeline


def get_aspect_sentiment_analyzer():
    """Carrega uma única vez o checkpoint BERTimbau ABSA obrigatório."""
    global aspect_sentiment_analyzer
    if aspect_sentiment_analyzer is None:
        print(f"[IA] Carregando BERTimbau ABSA de {ABSA_MODEL_PATH}...", flush=True)
        aspect_sentiment_analyzer = AspectSentimentAnalyzer(ABSA_MODEL_PATH)
    return aspect_sentiment_analyzer

def analyze_aspects(text):
    return analyze_aspects_with(text, get_aspect_sentiment_analyzer())

async def collect_with_browser(target_url, collection_warnings):
    """Coletor legado mantido como fallback operacional explícito."""
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            timeout=60000,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
        )
        browser_version = browser.version
        context = await browser.new_context(
            locale='pt-BR',
            user_agent=(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                f'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{browser_version} Safari/537.36'
            ),
            viewport={'width': 1280, 'height': 800}
        )
        context.set_default_timeout(15000)
        context.set_default_navigation_timeout(60000)
        page = await context.new_page()

        try:
            await page.goto(target_url, timeout=60000, wait_until='domcontentloaded')
            await page.wait_for_timeout(5000)

            async def accept_cookie_consent():
                for selector in [
                    'button:has-text("Aceitar tudo")',
                    'button:has-text("Accept all")',
                    'button:has-text("Concordar")',
                    'button:has-text("Agree")',
                    '[aria-label="Aceitar tudo"]',
                ]:
                    try:
                        btn = page.locator(selector).first
                        if await btn.is_visible(timeout=1200):
                            await btn.click()
                            print("[INFO] Cookie consent aceito.")
                            await page.wait_for_timeout(2000)
                            return
                    except:
                        continue

            await accept_cookie_consent()
            expected = await prepare_reviews(page, accept_cookie_consent, warnings=collection_warnings)
            return await collect_reviews(
                page,
                TARGET_REVIEWS,
                expected=expected,
                warnings=collection_warnings,
            )
        finally:
            await context.close()
            await browser.close()


async def collect_input_reviews(collection_warnings, collection_metadata):
    if COLLECTOR_PROVIDER == 'apify':
        print("[COLETA] Provedor: Apify.", flush=True)
        return await collect_reviews_from_apify(
            TARGET_URL,
            TARGET_REVIEWS,
            warnings=collection_warnings,
            metadata=collection_metadata,
        )
    if COLLECTOR_PROVIDER == 'serpapi':
        print("[COLETA] Provedor: SerpApi.", flush=True)
        return await collect_reviews_from_serpapi(
            TARGET_URL,
            TARGET_REVIEWS,
            warnings=collection_warnings,
        )
    if COLLECTOR_PROVIDER in {'browser', 'playwright'}:
        print("[COLETA] Provedor legado: navegador automatizado.", flush=True)
        return await collect_with_browser(TARGET_URL, collection_warnings)
    raise RuntimeError(
        "REVIEW_COLLECTOR_PROVIDER inválido. Use 'apify', 'serpapi' ou 'browser'."
    )


def process_reviews(collected_reviews):
    print(f"[PROCESSANDO] {len(collected_reviews)} reviews para analisar...", flush=True)
    processed_data = []
    for i, review in enumerate(collected_reviews):
        if len(processed_data) >= TARGET_REVIEWS:
            break
        try:
            author = review["author"]
            original_text = review.get("text")
            if not isinstance(original_text, str) or not original_text.strip():
                print(f"[IGNORADA review {i}] avaliação sem comentário textual.", flush=True)
                continue
            original_text = original_text.strip()
            rating = review["rating"]
            date = review["date"]

            # Respect the tokenizer's token limit (characters are not tokens).
            # Keep the complete text for storage and aspect extraction.
            overall = get_sentiment_pipeline()(original_text, truncation=True)[0]
            sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}
            overall_sentiment = sentiment_map.get(overall['label'], 'Neutro')
            sentiment_score = round(overall['score'], 4)
            aspects = analyze_aspects(original_text)

            processed_data.append({
                **review_identity(
                    review.get("review_id"), author, rating, original_text
                ),
                "author": author,
                "text": original_text,
                "rating": rating,
                "date": date,
                "source": {
                    'apify': "Google Maps via Apify",
                    'serpapi': "Google Maps via SerpApi",
                }.get(COLLECTOR_PROVIDER, "Google Maps"),
                "sentimentScore": sentiment_score,
                "overallSentiment": overall_sentiment,
                "aspects": aspects
            })

            if len(processed_data) % 10 == 0:
                print(f"[PROGRESSO] {len(processed_data)} analisadas...")

        except AbsaModelError:
            raise
        except Exception as error:
            print(f"[ERRO review {i}]: {error}")
            raise RuntimeError(
                "A análise de sentimentos falhou; esta execução não será importada."
            ) from error
    return processed_data


async def run():
    if TARGET_URL is None:
        raise RuntimeError("Faltou a URL do Maps.")
    print(f"[INFO] Iniciando Mineracao para: {TARGET_URL}")

    try:
        require_absa_model(
            ABSA_MODEL_PATH,
            ABSA_MODEL_SHA256,
            require_checksum=True,
        )
        get_aspect_sentiment_analyzer()
    except AbsaModelError as error:
        print(f"[MINING_ERROR] {error}", flush=True)
        raise

    try:
        collection_warnings = []
        collection_metadata = {}
        collected_reviews = await collect_input_reviews(
            collection_warnings,
            collection_metadata,
        )
        processed_data = process_reviews(collected_reviews)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as output:
            json.dump(
                {
                    "reviews": processed_data,
                    "collectionWarnings": list(dict.fromkeys(collection_warnings)),
                    "collectionProvider": COLLECTOR_PROVIDER,
                    "collectionMetadata": collection_metadata,
                },
                output,
                ensure_ascii=False,
                indent=2,
            )
        print(f"[SUCESSO] {len(processed_data)} reviews salvas em {OUTPUT_FILE}")
    except Exception as error:
        print(f"[ERRO CRITICO] {error}")
        print(f"[MINING_ERROR] {error}", flush=True)
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    if TARGET_URL is None:
        print("[ERRO] Faltou a URL do Maps.")
        raise SystemExit(1)
    try:
        asyncio.run(run())
    except AbsaModelError:
        raise SystemExit(1)
