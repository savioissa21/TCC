import asyncio
from playwright.async_api import async_playwright
import json
import re

# --- CONFIGURAÇÃO ---
# Seu link atualizado
TARGET_URL = "https://www.google.com/maps/place/Pizzaria+Artesanal+e+Churrascaria+Seu+Geraldo,+Vian%C3%B3polis-GO/@-17.2232079,-48.3508126,380747m/data=!3m1!1e3!4m8!3m7!1s0x9358d85ff8cb1f79:0x994db1a5cf4a36ec!8m2!3d-16.7444547!4d-48.5191663!9m1!1b1!16s%2Fg%2F11gfhyx_jv?entry=ttu"
MAX_REVIEWS = 100

async def run():
    print("🤖 Iniciando Minerador V3 (Com clique na aba)...")
    
    async with async_playwright() as p:
        # headless=False para você ver acontecendo
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 800},
            locale='pt-BR' # Força português para garantir que os seletores funcionem
        )
        page = await context.new_page()
        
        print(f"📍 Acessando Google Maps...")
        await page.goto(TARGET_URL)
        await page.wait_for_timeout(5000) # Espera carregar bem

        # --- PASSO 1: CLICAR NA ABA AVALIAÇÕES ---
        print("🖱️ Tentando clicar na aba 'Avaliações'...")
        try:
            # Procura botões que tenham o texto "Avaliações" ou "Reviews"
            # O seletor usa text= para ser mais genérico
            await page.locator('button[role="tab"]:has-text("Avaliações")').click()
            await page.wait_for_timeout(3000) # Espera a lista carregar
        except Exception as e:
            print("⚠️ Não achei o botão de aba específico, tentando seguir na página atual...")
            # Às vezes já abre direto nas avaliações

        # --- PASSO 2: SCROLL COM MOUSE WHEEL ---
        print("📜 Iniciando rolagem inteligente...")
        
        # Tenta achar o container das reviews. 
        # Estratégia: Achar a primeira review e focar nela, depois rolar a página
        try:
            # Espera aparecer pelo menos uma review
            await page.locator('div.jftiEf').first.wait_for(timeout=10000)
            
            # Pega a lista de reviews inicial
            reviews_locator = page.locator('div.jftiEf')
            
            last_count = 0
            stuck_counter = 0

            for i in range(20): # Tenta rolar 20 vezes
                
                count = await reviews_locator.count()
                print(f"   ↳ Reviews visíveis: {count}")
                
                if count >= MAX_REVIEWS:
                    print("🎯 Meta atingida!")
                    break
                
                # Se o número não mudou, conta como "travado"
                if count == last_count:
                    stuck_counter += 1
                else:
                    stuck_counter = 0 # Reseta se achou novos
                
                # Se travou por 3 vezes seguidas, para
                if stuck_counter >= 3:
                    print("⚠️ Parece que acabaram as reviews ou travou.")
                    break

                last_count = count

                # --- A MÁGICA DO SCROLL ---
                # Foca na última review encontrada
                if count > 0:
                    await reviews_locator.nth(count - 1).hover()
                    await page.mouse.wheel(0, 5000) # Rola a "rodinha" muito para baixo
                    await page.wait_for_timeout(1500) # Espera carregar
                else:
                    # Se não achou nenhuma review ainda, tenta rolar o centro da tela
                    await page.mouse.wheel(0, 5000)
                    await page.wait_for_timeout(2000)

        except Exception as e:
            print(f"❌ Erro na rolagem: {e}")

        # --- PASSO 3: EXTRAÇÃO ---
        print("⛏️ Extraindo textos finais (expandindo comentários longos)...")
        reviews = await page.locator('div.jftiEf').all()
        extracted_data = []

        for review in reviews:
            try:
                # --- MELHORIA AQUI: EXPANDIR TEXTO ---
                # Procura por botões que contenham "Mais" ou "Ver mais" dentro deste comentário específico
                more_btn = review.locator('button').filter(has_text="Mais")
                
                if await more_btn.count() > 0:
                    if await more_btn.is_visible():
                        await more_btn.click(force=True)
                        await page.wait_for_timeout(200) # Pequena pausa para o texto expandir

                # Extração segura
                text = ""
                text_el = review.locator('.wiI7pd')
                if await text_el.count() > 0:
                    text = await text_el.inner_text()
                
                # Extrai Autor
                author = "Anônimo"
                author_el = review.locator('.d4r55') # Classe comum para nome do autor
                if await author_el.count() > 0:
                    author = await author_el.inner_text()

                # Extrai Nota
                rating = 0
                rating_el = review.locator('span.kvMYJc')
                rating_attr = await rating_el.get_attribute('aria-label')
                if rating_attr:
                    # Pega o primeiro número da string "5 estrelas"
                    match = re.search(r'(\d+)', rating_attr)
                    if match:
                        rating = int(match.group(1))

                # Extrai Data
                date = "Desconhecida"
                date_el = review.locator('.rsqaWe')
                if await date_el.count() > 0:
                    date = await date_el.inner_text()

                if text: # Só salva se tiver texto
                    extracted_data.append({
                        "author": author,
                        "rating": rating,
                        "text": text.replace("\n", " "),
                        "date": date
                    })
            except:
                continue

        print(f"✅ SUCESSO! {len(extracted_data)} reviews salvas.")
        
        with open('reviews.json', 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, ensure_ascii=False, indent=4)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())