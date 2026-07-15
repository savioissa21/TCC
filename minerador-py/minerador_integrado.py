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

print("[IA] Carregando modelo de analise de sentimentos...")
sentiment_pipeline = pipeline("sentiment-analysis", model="pysentimiento/bertweet-pt-sentiment")

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
                    result = sentiment_pipeline(sentence[:512])[0]
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
            try:
                await page.wait_for_selector('button[role="tab"]', timeout=10000)
                tabs = page.locator('button[role="tab"]')
                tab_count = await tabs.count()
                print(f"[INFO] {tab_count} abas encontradas.")
                for i in range(tab_count):
                    tab_text = await tabs.nth(i).inner_text()
                    if 'avaliaç' in tab_text.lower() or 'review' in tab_text.lower():
                        await tabs.nth(i).click()
                        print("[INFO] Aba Avaliacoes clicada.")
                        await page.wait_for_timeout(2000)
                        break
            except Exception as e:
                print(f"[AVISO] Aba Avaliacoes: {e}")

            # 3. Aguardar reviews aparecerem
            try:
                await page.wait_for_selector('div.jftiEf', timeout=15000)
                print("[INFO] Reviews encontradas, iniciando scroll...")
            except:
                print("[AVISO] Seletor jftiEf nao encontrou nada. Tentando continuar...")

            # 4. Encontrar painel de scroll (div interna das reviews, não a janela)
            scroll_panel = None
            for panel_selector in [
                'div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde',
                'div.m6QErb.DxyBCb.kA9KIf.dS8AEf',
                'div.m6QErb[aria-label]',
                'div.m6QErb',
            ]:
                try:
                    panel = page.locator(panel_selector).first
                    if await panel.count() > 0:
                        scroll_panel = panel
                        print(f"[INFO] Painel de scroll: {panel_selector}")
                        break
                except:
                    continue

            # 5. Loop de scroll
            reviews_locator = page.locator('div.jftiEf')
            no_change_count = 0
            last_count = 0

            for attempt in range(60):  # máximo 60 tentativas
                count = await reviews_locator.count()
                print(f"[SCROLL] Reviews: {count}")

                if count >= TARGET_REVIEWS:
                    print("[INFO] Meta atingida!")
                    break

                if count == last_count:
                    no_change_count += 1
                else:
                    no_change_count = 0

                if no_change_count > 8:
                    print("[INFO] Sem novas reviews, encerrando scroll.")
                    break

                last_count = count

                try:
                    # Prioridade: scroll no painel interno das reviews
                    if scroll_panel:
                        await scroll_panel.evaluate('el => el.scrollTop += 3000')
                    elif count > 0:
                        # Fallback: hover no último review e usar mouse wheel
                        await reviews_locator.nth(count - 1).scroll_into_view_if_needed()
                        await page.mouse.wheel(0, 3000)
                    else:
                        await page.mouse.wheel(0, 3000)

                    await page.wait_for_timeout(1800)
                except Exception as e:
                    print(f"[ERRO SCROLL] {e}")
                    break

            # 6. Expandir "Mais" e extrair dados
            all_reviews = await reviews_locator.all()
            total = len(all_reviews)
            print(f"[PROCESSANDO] {min(total, TARGET_REVIEWS)} reviews para analisar...")

            processed_data = []
            for i, review in enumerate(all_reviews):
                if len(processed_data) >= TARGET_REVIEWS:
                    break
                try:
                    # Expandir texto longo
                    for btn_text in ["Mais", "Ver mais", "more", "More"]:
                        more_btn = review.locator(f'button:has-text("{btn_text}")')
                        if await more_btn.count() > 0:
                            await more_btn.first.click(force=True)
                            await page.wait_for_timeout(300)
                            break

                    # Texto da review
                    text_el = review.locator('.wiI7pd')
                    if await text_el.count() == 0:
                        continue
                    text = (await text_el.inner_text()).strip()
                    if not text:
                        continue

                    # Autor
                    try:
                        author = await review.locator('.d4r55').inner_text()
                    except:
                        author = "Anônimo"

                    # Nota
                    try:
                        rating_attr = await review.locator('span.kvMYJc').get_attribute('aria-label')
                        match = re.search(r'(\d+)', rating_attr or '')
                        rating = int(match.group(1)) if match else 0
                    except:
                        rating = 0

                    # Data
                    try:
                        date = await review.locator('.rsqaWe').inner_text()
                    except:
                        date = ""

                    # Sentimento geral
                    overall = sentiment_pipeline(text[:512])[0]
                    sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}

                    processed_data.append({
                        "id": str(uuid.uuid4()),
                        "author": author,
                        "text": text,
                        "rating": rating,
                        "date": date,
                        "source": "Google Maps",
                        "sentimentScore": round(overall['score'], 4),
                        "overallSentiment": sentiment_map.get(overall['label'], 'Neutro'),
                        "aspects": analyze_aspects(text)
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
            import traceback
            traceback.print_exc()
        finally:
            await context.close()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
