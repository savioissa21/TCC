import sys
import asyncio
from playwright.async_api import async_playwright
import json
import os
from pathlib import Path
from transformers import pipeline

from review_identity import review_identity
from maps_collector import prepare_reviews, collect_reviews
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

    async with async_playwright() as p:
        # User-agent real para evitar detecção de bot pelo Google
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
            await page.goto(TARGET_URL, timeout=60000, wait_until='domcontentloaded')
            await page.wait_for_timeout(5000)

            # 1. Aceitar cookies (Google Consent - aparece sempre em headless)
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
            collection_warnings = []
            expected = await prepare_reviews(page, accept_cookie_consent, warnings=collection_warnings)
            collected_reviews = await collect_reviews(page, TARGET_REVIEWS, expected=expected, warnings=collection_warnings)
            print(f"[PROCESSANDO] {len(collected_reviews)} reviews para analisar...", flush=True)

            processed_data = []
            for i, review in enumerate(collected_reviews):
                if len(processed_data) >= TARGET_REVIEWS:
                    break
                try:
                    author = review["author"]
                    original_text = review["text"]
                    rating = review["rating"]
                    date = review["date"]

                    if original_text:
                        # Respect the tokenizer's token limit (characters are not tokens).
                        # Keep the complete text for storage and aspect extraction.
                        overall = get_sentiment_pipeline()(original_text, truncation=True)[0]
                        sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}
                        overall_sentiment = sentiment_map.get(overall['label'], 'Neutro')
                        sentiment_score = round(overall['score'], 4)
                        aspects = analyze_aspects(original_text)
                        display_text = original_text
                    else:
                        # Sem comentário, a nota é o único sinal disponível.
                        overall_sentiment = 'Positivo' if rating >= 4 else 'Negativo' if rating <= 2 else 'Neutro'
                        sentiment_score = 1.0
                        aspects = []
                        display_text = "Avaliação sem comentário."

                    processed_data.append({
                        **review_identity(
                            review.get("review_id"), author, rating, original_text
                        ),
                        "author": author,
                        "text": display_text,
                        "rating": rating,
                        "date": date,
                        "source": "Google Maps",
                        "sentimentScore": sentiment_score,
                        "overallSentiment": overall_sentiment,
                        "aspects": aspects
                    })

                    if len(processed_data) % 10 == 0:
                        print(f"[PROGRESSO] {len(processed_data)} analisadas...")

                except AbsaModelError:
                    raise
                except Exception as e:
                    print(f"[ERRO review {i}]: {e}")
                    raise RuntimeError("A análise de sentimentos falhou; esta execução não será importada.") from e

            # 7. Salvar
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump({"reviews": processed_data, "collectionWarnings": list(dict.fromkeys(collection_warnings))},
                          f, ensure_ascii=False, indent=2)

            print(f"[SUCESSO] {len(processed_data)} reviews salvas em {OUTPUT_FILE}")

        except Exception as e:
            print(f"[ERRO CRITICO] {e}")
            print(f"[MINING_ERROR] {e}", flush=True)
            import traceback
            traceback.print_exc()
            raise
        finally:
            await context.close()
            await browser.close()

if __name__ == "__main__":
    if TARGET_URL is None:
        print("[ERRO] Faltou a URL do Maps.")
        raise SystemExit(1)
    try:
        asyncio.run(run())
    except AbsaModelError:
        raise SystemExit(1)
