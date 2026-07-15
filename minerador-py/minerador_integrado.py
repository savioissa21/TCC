import sys
import asyncio
from playwright.async_api import async_playwright
import json
import re
import uuid
from transformers import pipeline

if len(sys.argv) < 2:
    print("[ERRO] Faltou a URL do Maps.")
    sys.exit(1)

TARGET_URL = sys.argv[1]
OUTPUT_FILE = 'dados_temp.json'
TARGET_REVIEWS = 100

sentiment_pipeline = None

def get_sentiment_pipeline():
    global sentiment_pipeline
    if sentiment_pipeline is None:
        print("[IA] Carregando modelo de analise de sentimentos...", flush=True)
        sentiment_pipeline = pipeline("sentiment-analysis", model="pysentimiento/bertweet-pt-sentiment")
    return sentiment_pipeline

ASPECT_KEYWORDS = {
    "Atendimento": ["garçom", "atendimento", "serviço", "demora", "rápido", "lento", "educado", "grosseiro", "funcionário", "equipe", "recepção", "espera"],
    "Comida": ["pizza", "sabor", "gostosa", "fria", "quente", "massa", "recheio", "borda", "cardápio", "bebida", "suco", "carne", "sobremesa", "prato", "comida", "lanche"],
    "Ambiente": ["lugar", "local", "ambiente", "banheiro", "limpeza", "sujo", "barulho", "música", "confortável", "mesa", "cadeira", "espaço", "iluminação", "decoração"],
    "Preço": ["preço", "valor", "caro", "barato", "conta", "pagar", "custo", "promoção", "custa", "cobrar"]
}

def analyze_aspects(text):
    detected_aspects = []
    sentences = re.split(r'[.!?;]\s*', text)
    for sentence in sentences:
        if not sentence.strip():
            continue
        sentence_lower = sentence.lower()
        for aspect_name, keywords in ASPECT_KEYWORDS.items():
            if any(word in sentence_lower for word in keywords):
                try:
                    result = get_sentiment_pipeline()(sentence[:512])[0]
                    sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}
                    detected_aspects.append({
                        "name": aspect_name,
                        "sentiment": sentiment_map.get(result['label'], 'Neutro'),
                        "excerpt": sentence.strip()
                    })
                except:
                    continue
    return detected_aspects

async def run():
    print(f"[INFO] Iniciando Mineracao para: {TARGET_URL}")

    async with async_playwright() as p:
        # User-agent real para evitar detecção de bot pelo Google
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            locale='pt-BR',
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        try:
            await page.goto(TARGET_URL, timeout=60000, wait_until='domcontentloaded')
            await page.wait_for_timeout(3000)

            # 1. Aceitar cookies (Google Consent - aparece sempre em headless)
            for selector in [
                'button:has-text("Aceitar tudo")',
                'button:has-text("Accept all")',
                'button:has-text("Concordar")',
                'button:has-text("Agree")',
                '[aria-label="Aceitar tudo"]',
            ]:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                        print("[INFO] Cookie consent aceito.")
                        await page.wait_for_timeout(2000)
                        break
                except:
                    continue

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
                body_text = await page.locator('body').inner_text()
                if 'limited view of google maps' in body_text.lower():
                    raise RuntimeError(
                        "O Google Maps exibiu uma visualização limitada e ocultou as avaliações. Tente novamente em alguns instantes."
                    )

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
                body_text = await page.locator('body').inner_text()
                if 'limited view of google maps' in body_text.lower():
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
                        "id": str(uuid.uuid4()),
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
