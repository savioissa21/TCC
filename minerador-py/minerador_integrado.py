import sys
import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import re
from pathlib import Path
from transformers import pipeline

from aspect_extractor import extract_aspect_candidates
from bertimbau_absa import AspectSentimentAnalyzer, model_is_available

if len(sys.argv) < 2:
    print("[ERRO] Faltou a URL do Maps.")
    sys.exit(1)

TARGET_URL = sys.argv[1]
OUTPUT_FILE = os.getenv('MINING_OUTPUT_FILE', 'dados_temp.json')
TARGET_REVIEWS = int(os.getenv('TARGET_REVIEWS', '100'))


def stable_review_id(review_id, author, rating, text):
    """Gera um identificador repetível, inclusive quando o Maps omite seu ID."""
    source_key = review_id or "|".join(
        [author.strip().lower(), str(rating), " ".join(text.lower().split())]
    )
    return hashlib.sha256(source_key.encode("utf-8")).hexdigest()

sentiment_pipeline = None
aspect_sentiment_analyzer = None
aspect_model_checked = False

DEFAULT_ABSA_MODEL = Path(__file__).resolve().parent / "artifacts" / "bertimbau-absa"
ABSA_MODEL_PATH = Path(os.getenv("ABSA_MODEL_PATH", DEFAULT_ABSA_MODEL))

def get_sentiment_pipeline():
    global sentiment_pipeline
    if sentiment_pipeline is None:
        print("[IA] Carregando modelo de analise de sentimentos...", flush=True)
        sentiment_pipeline = pipeline("sentiment-analysis", model="pysentimiento/bertweet-pt-sentiment")
    return sentiment_pipeline


def get_aspect_sentiment_analyzer():
    """Carrega o BERTimbau ABSA uma vez e mantém fallback para o BERTweet."""
    global aspect_sentiment_analyzer, aspect_model_checked
    if not aspect_model_checked:
        aspect_model_checked = True
        if model_is_available(ABSA_MODEL_PATH):
            print(f"[IA] Carregando BERTimbau ABSA de {ABSA_MODEL_PATH}...", flush=True)
            aspect_sentiment_analyzer = AspectSentimentAnalyzer(ABSA_MODEL_PATH)
        else:
            print(
                "[IA] BERTimbau ABSA não encontrado; usando o BERTweet por frase.",
                flush=True,
            )
    return aspect_sentiment_analyzer

def analyze_aspects(text):
    detected_aspects = []
    for candidate in extract_aspect_candidates(text):
        try:
            analyzer = get_aspect_sentiment_analyzer()
            if analyzer:
                prediction = analyzer.predict(
                    candidate["excerpt"],
                    candidate["name"],
                    candidate["target"],
                )
                sentiment = prediction["sentiment"]
            else:
                result = get_sentiment_pipeline()(candidate["excerpt"][:512])[0]
                sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}
                sentiment = sentiment_map.get(result['label'], 'Neutro')
            detected_aspects.append({
                "name": candidate["name"],
                "sentiment": sentiment,
                "excerpt": candidate["excerpt"],
            })
        except Exception as error:
            print(
                f"[AVISO] Falha ao analisar o aspecto {candidate['name']}: {error}",
                flush=True,
            )
    return detected_aspects

async def run():
    print(f"[INFO] Iniciando Mineracao para: {TARGET_URL}")

    async with async_playwright() as p:
        # User-agent real para evitar detecção de bot pelo Google
        browser = await p.chromium.launch(
            headless=True,
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

            async def has_reviews_entry_point():
                if await page.locator('div.jftiEf').count() > 0:
                    return True

                tabs = page.locator('button[role="tab"]')
                for tab_index in range(await tabs.count()):
                    tab = tabs.nth(tab_index)
                    tab_text = (await tab.inner_text()).lower()
                    tab_label = (await tab.get_attribute('aria-label') or '').lower()
                    if 'avaliaç' in tab_text or 'review' in tab_text or 'avaliaç' in tab_label or 'review' in tab_label:
                        return True

                return await page.locator(
                    'button[jsaction*="moreReviews"], '
                    'button:has-text("Mais avaliações"), '
                    'button:has-text("More reviews")'
                ).count() > 0

            await accept_cookie_consent()

            # O Maps pode entregar uma visualização limitada na primeira
            # abertura anônima. Depois que os cookies iniciais são gravados,
            # uma recarga geralmente libera a aba e os cartões de avaliação.
            for retry in range(2):
                if await has_reviews_entry_point():
                    break

                body_text = (await page.locator('body').inner_text()).lower()
                limited_view = (
                    'limited view of google maps' in body_text
                    or 'visualização limitada do google maps' in body_text
                )
                reason = 'visualização limitada' if limited_view else 'avaliações ainda não carregadas'
                print(f"[AVISO] Google Maps sem acesso às avaliações ({reason}). Recarregando ({retry + 1}/2)...")
                await page.reload(timeout=60000, wait_until='domcontentloaded')
                await page.wait_for_timeout(5000)
                await accept_cookie_consent()

            # 2. Clicar na aba Avaliações
            reviews_tab_clicked = False
            try:
                await page.wait_for_selector('button[role="tab"]', timeout=10000)
                tabs = page.locator('button[role="tab"]')
                tab_count = await tabs.count()
                print(f"[INFO] {tab_count} abas encontradas.")
                for i in range(tab_count):
                    tab_text = await tabs.nth(i).inner_text()
                    if 'avaliaç' in tab_text.lower() or 'review' in tab_text.lower():
                        await tabs.nth(i).click()
                        reviews_tab_clicked = True
                        print("[INFO] Aba Avaliacoes clicada.")
                        await page.wait_for_timeout(2000)
                        break
            except Exception as e:
                print(f"[AVISO] Aba Avaliacoes: {e}")

            if not reviews_tab_clicked:
                for selector in [
                    'button[jsaction*="moreReviews"]',
                    'button:has-text("Mais avaliações")',
                    'button:has-text("More reviews")',
                ]:
                    try:
                        reviews_button = page.locator(selector).first
                        if await reviews_button.is_visible(timeout=1500):
                            await reviews_button.click()
                            reviews_tab_clicked = True
                            print("[INFO] Lista de Avaliacoes aberta.")
                            await page.wait_for_timeout(2500)
                            break
                    except:
                        continue

            if not reviews_tab_clicked:
                body_text = (await page.locator('body').inner_text()).lower()
                if (
                    'limited view of google maps' in body_text
                    or 'visualização limitada do google maps' in body_text
                ):
                    raise RuntimeError(
                        "O Google Maps exibiu uma visualização limitada e ocultou as avaliações. Tente novamente em alguns instantes."
                    )

            # A coleta recorrente precisa priorizar as avaliações novas. Sem
            # esta ordenação, o Maps costuma manter "Mais relevantes" e pode
            # devolver sempre o mesmo lote nas execuções futuras.
            sorted_by_newest = False
            for selector in [
                'button[aria-label*="Classificar"]',
                'button[aria-label*="Ordenar"]',
                'button[aria-label*="Sort"]',
                'button:has-text("Mais relevantes")',
                'button:has-text("Most relevant")',
            ]:
                try:
                    sort_button = page.locator(selector).first
                    if await sort_button.is_visible(timeout=1500):
                        await sort_button.click()
                        await page.wait_for_timeout(500)
                        options = page.locator('[role="menuitemradio"], [role="menuitem"]')
                        for option_index in range(await options.count()):
                            option = options.nth(option_index)
                            option_text = (await option.inner_text()).strip().lower()
                            if 'mais recentes' in option_text or 'newest' in option_text:
                                await option.click()
                                await page.wait_for_timeout(2500)
                                sorted_by_newest = True
                                print("[INFO] Avaliações ordenadas por mais recentes.")
                                break
                        if sorted_by_newest:
                            break
                        await page.keyboard.press("Escape")
                except:
                    continue

            if not sorted_by_newest:
                print("[AVISO] Não foi possível confirmar a ordenação por mais recentes.")

            # 3. Aguardar reviews aparecerem
            try:
                await page.wait_for_selector('div.jftiEf', timeout=15000)
                print("[INFO] Reviews encontradas, iniciando scroll...")
            except:
                print("[AVISO] Seletor jftiEf nao encontrou nada. Tentando continuar...")

            # 4. Encontrar o ancestral realmente rolável da lista de avaliações.
            # Há vários painéis m6QErb na página e o primeiro pode ser a lista
            # lateral de resultados, não a lista de avaliações.
            scroll_panel = None
            reviews_locator = page.locator('div.jftiEf')
            if await reviews_locator.count() > 0:
                try:
                    panel_handle = await reviews_locator.first.evaluate_handle("""
                        review => {
                            let element = review.parentElement;
                            while (element) {
                                const style = window.getComputedStyle(element);
                                const canScroll = element.scrollHeight > element.clientHeight + 10;
                                const hasScrollOverflow = /auto|scroll/.test(style.overflowY);
                                if (canScroll && hasScrollOverflow) return element;
                                element = element.parentElement;
                            }
                            return null;
                        }
                    """)
                    scroll_panel = panel_handle.as_element()
                    if scroll_panel:
                        print("[INFO] Painel rolável das avaliações encontrado.")
                except Exception as e:
                    print(f"[AVISO] Painel rolável não identificado: {e}")

            # 5. Coletar cada lote enquanto ele está visível. O Google Maps
            # virtualiza a lista: avaliações antigas podem sair do DOM durante
            # a rolagem e não podem ser recuperadas apenas no final.
            raw_reviews = {}

            async def collect_visible_reviews():
                visible_count = await reviews_locator.count()
                added = 0

                for index in range(visible_count):
                    try:
                        review = reviews_locator.nth(index)

                        for btn_text in ["Mais", "Ver mais", "more", "More"]:
                            more_btn = review.locator(f'button:has-text("{btn_text}")').first
                            if await more_btn.count() > 0:
                                try:
                                    await more_btn.click(force=True, timeout=1500)
                                    await page.wait_for_timeout(100)
                                except:
                                    pass
                                break

                        try:
                            review_id = await review.get_attribute('data-review-id')
                        except:
                            review_id = None

                        try:
                            author = (await review.locator('.d4r55').first.inner_text()).strip()
                        except:
                            author = "Anônimo"

                        try:
                            rating_attr = await review.locator('span.kvMYJc').first.get_attribute('aria-label')
                            match = re.search(r'(\d+)', rating_attr or '')
                            rating = int(match.group(1)) if match else 0
                        except:
                            rating = 0

                        try:
                            date = (await review.locator('.rsqaWe').first.inner_text()).strip()
                        except:
                            date = ""

                        # A resposta oficial da empresa também pode usar wiI7pd.
                        # A primeira ocorrência pertence ao texto do cliente.
                        try:
                            text_locator = review.locator('.wiI7pd').first
                            text = (await text_locator.inner_text()).strip() if await text_locator.count() > 0 else ""
                        except:
                            text = ""

                        # Avaliações somente com estrelas também são válidas.
                        if not text and rating == 0:
                            continue

                        dedup_key = review_id or f"{author}|{date}|{rating}|{text}"
                        if dedup_key in raw_reviews:
                            continue

                        raw_reviews[dedup_key] = {
                            "review_id": review_id,
                            "author": author,
                            "text": text,
                            "rating": rating,
                            "date": date,
                        }
                        added += 1
                    except Exception as e:
                        print(f"[AVISO coleta {index}]: {e}")

                return visible_count, added

            # 6. Loop de scroll e coleta incremental
            no_change_count = 0

            for attempt in range(80):
                count, added = await collect_visible_reviews()
                discovered = len(raw_reviews)
                print(f"[SCROLL] No DOM: {count} | coletadas: {discovered} (+{added})")

                if discovered >= TARGET_REVIEWS:
                    print("[INFO] Meta atingida!")
                    break

                if added == 0:
                    no_change_count += 1
                else:
                    no_change_count = 0

                if no_change_count > 12:
                    print("[INFO] Sem novas avaliações após várias rolagens, encerrando.")
                    break

                try:
                    # Avança menos de uma tela para não pular itens virtualizados.
                    if scroll_panel:
                        await scroll_panel.evaluate(
                            'el => el.scrollBy(0, Math.max(600, Math.floor(el.clientHeight * 0.85)))'
                        )

                    if count > 0:
                        last_review = reviews_locator.nth(count - 1)
                        try:
                            await last_review.hover(timeout=1500)
                            await page.mouse.wheel(0, 900)
                        except:
                            pass
                    else:
                        await page.mouse.wheel(0, 900)

                    await page.wait_for_timeout(1400)
                except Exception as e:
                    print(f"[ERRO SCROLL] {e}")
                    break

            # Uma última coleta captura o lote carregado pela rolagem final.
            await collect_visible_reviews()
            collected_reviews = list(raw_reviews.values())[:TARGET_REVIEWS]
            total = len(collected_reviews)
            print(f"[PROCESSANDO] {min(total, TARGET_REVIEWS)} reviews para analisar...")

            if total == 0:
                body_text = (await page.locator('body').inner_text()).lower()
                if (
                    'limited view of google maps' in body_text
                    or 'visualização limitada do google maps' in body_text
                ):
                    raise RuntimeError(
                        "O Google Maps exibiu uma visualização limitada e ocultou as avaliações. Tente novamente em alguns instantes."
                    )
                raise RuntimeError(
                    "A página abriu, mas nenhuma avaliação foi encontrada. Confirme se o estabelecimento possui avaliações públicas."
                )

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
                        overall = get_sentiment_pipeline()(original_text[:512])[0]
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
                        "id": stable_review_id(
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

                except Exception as e:
                    print(f"[ERRO review {i}]: {e}")
                    continue

            # 7. Salvar
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(processed_data, f, ensure_ascii=False, indent=2)

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
    asyncio.run(run())
