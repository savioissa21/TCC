"""Coleta do DOM do Maps, independente dos modelos de sentimento."""
import re

REVIEW_SELECTOR = 'div.jftiEf'
SORT_SELECTOR = (
    'button[aria-label*="Classificar"], button[aria-label*="Ordenar"], '
    'button[aria-label*="Sort"], button:has-text("Mais relevantes"), '
    'button:has-text("Most relevant")'
)
ENTRY_SELECTOR = (
    'button[role="tab"], button[jsaction*="moreReviews"], '
    'button[aria-label*="avaliações"], button[aria-label*="reviews"], '
    'button:has-text("Mais avaliações"), button:has-text("More reviews")'
)


async def open_reviews_panel(page, accept_consent):
    """Cartões da prévia não comprovam acesso à lista completa."""
    expected = None
    for attempt in range(3):
        entries = page.locator(ENTRY_SELECTOR)
        for index in range(await entries.count()):
            entry = entries.nth(index)
            label = ((await entry.get_attribute('aria-label') or '') + ' ' + await entry.inner_text()).strip()
            if not re.search(r'avaliaç|review', label, re.I):
                continue
            count = re.search(r'([\d.,\s]+)\s*(?:avaliaç|reviews)', label, re.I)
            if count:
                digits = re.sub(r'\D', '', count.group(1))
                if digits:
                    expected = int(digits)
            try:
                if await entry.is_visible():
                    await entry.click(timeout=3000)
                    await page.locator(SORT_SELECTOR).first.wait_for(state='visible', timeout=5000)
                    return expected
            except Exception:
                continue
        if await page.locator(SORT_SELECTOR).first.is_visible():
            return expected
        if attempt < 2:
            print('[AVISO] Lista completa indisponível; recarregando o Maps.', flush=True)
            await page.reload(wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(2500)
            await accept_consent()
    raise RuntimeError('Não foi possível abrir a lista completa de avaliações do Google Maps; a prévia não será importada.')


async def sort_by_newest(page):
    button = page.locator(SORT_SELECTOR).first
    await button.click(timeout=5000)
    option = page.locator('[role="menuitemradio"], [role="menuitem"]').filter(
        has_text=re.compile(r'mais recentes|newest', re.I))
    await option.first.click(timeout=5000)
    await page.wait_for_timeout(1500)
    print('[INFO] Lista completa ordenada por mais recentes.', flush=True)


async def prepare_reviews(page, accept_consent, *, warnings=None):
    expected = None
    for attempt in range(3):
        try:
            expected = await open_reviews_panel(page, accept_consent)
            counts = await page.get_by_text(re.compile(r'^\s*[\d.,\s]+\s+(?:avaliações|reviews)\s*$', re.I)).all_text_contents()
            if counts:
                expected = int(re.sub(r'\D', '', counts[0]))
            await sort_by_newest(page)
            # A successful click can still lead to an empty/failed Maps panel.
            await page.locator(REVIEW_SELECTOR).first.wait_for(state='visible', timeout=10000)
            return expected
        except Exception as error:
            dismiss = page.get_by_role('button', name=re.compile(r'^(Dispensar|Dismiss|Agora não|Not now)$', re.I))
            if await dismiss.count() and await dismiss.first.is_visible():
                await dismiss.first.click(timeout=2500)
            await page.keyboard.press('Escape')
            if attempt == 2:
                if warnings is not None and not await page.locator(REVIEW_SELECTOR).first.is_visible():
                    await page.reload(wait_until='domcontentloaded', timeout=60000)
                    await page.wait_for_timeout(3000)
                    await accept_consent()
                    try:
                        await open_reviews_panel(page, accept_consent)
                    except RuntimeError:
                        pass
                if warnings is not None and await page.locator(REVIEW_SELECTOR).first.is_visible():
                    warnings.append('SORT_UNCONFIRMED')
                    print('[AVISO] Coleta parcial: importando somente as avaliações públicas acessíveis, sem ordenação confirmada.', flush=True)
                    return expected
                raise RuntimeError('O Google Maps não liberou a lista completa ordenada por mais recentes. Tente novamente mais tarde.') from error
            print('[AVISO] Ordenação bloqueada ou indisponível; reabrindo a página pública.', flush=True)
            await page.reload(wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(3000)
            await accept_consent()


async def expand_review(review):
    # jsaction identifies the customer text expander, excluding the options menu
    # and the business response. Exact text handles localized layout variants.
    buttons = await review.query_selector_all('button')
    for button in buttons:
        action = await button.get_attribute('jsaction') or ''
        label = (await button.inner_text()).strip()
        is_expander = 'expandReview' in action or re.fullmatch(
            r'(?:ler mais|ver mais|mais|read more|see more|more)(?:\s*[…\.]+)?', label, re.I)
        if not is_expander or 'reviewResponse' in action:
            continue
        # An expander adjacent to a later wiI7pd belongs to the owner response.
        belongs_to_customer = await button.evaluate('''button => {
            const card = button.closest('div.jftiEf');
            const firstText = card.querySelector('.wiI7pd');
            const texts = [...card.querySelectorAll('.wiI7pd')];
            const preceding = texts.filter(text => text.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
            return Boolean(firstText) && preceding.length <= 1;
        }''')
        if belongs_to_customer and await button.is_visible():
            before = await review.eval_on_selector('.wiI7pd', 'el => el.textContent')
            await button.click(timeout=2500)
            changed = await review.evaluate('''async (card, {button, before}) => {
                const deadline = Date.now() + 2500;
                while (Date.now() < deadline) {
                    const text = card.querySelector('.wiI7pd');
                    if (text && (text.textContent !== before || !button.isConnected ||
                        button.getAttribute('aria-expanded') === 'true' || button.getClientRects().length === 0)) return true;
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                return false;
            }''', {'button': button, 'before': before})
            if not changed:
                raise RuntimeError('O Maps não confirmou a expansão do comentário.')
            return


async def collect_reviews(page, target, *, expected=None, wait_ms=1400, max_rounds=100, stall_limit=8, warnings=None):
    if target < 1:
        raise ValueError('TARGET_REVIEWS deve ser positivo.')
    await page.locator(REVIEW_SELECTOR).first.wait_for(state='attached', timeout=15000)
    collected = {}
    stalls = 0
    failed_rounds = 0
    for _ in range(max_rounds):
        added = 0
        failed_cards = 0
        # Snapshot handles avoid nth(index) changing identity during virtualization.
        cards = await page.locator(REVIEW_SELECTOR).element_handles()
        for card in cards:
            try:
                await expand_review(card)
                data = await card.evaluate(r'''card => {
                    if (!card.isConnected) return null;
                    const value = selector => card.querySelector(selector)?.textContent?.trim() || '';
                    const rating = card.querySelector('span.kvMYJc, span[role="img"][aria-label]')?.getAttribute('aria-label') || '';
                    return {review_id: card.getAttribute('data-review-id'), author: value('.d4r55'),
                        text: value('.wiI7pd'), date: value('.rsqaWe'), rating: Number(rating.match(/\d+/)?.[0] || 0)};
                }''')
                if not data or (not data['text'] and not data['rating']):
                    continue
                key = data['review_id'] or f"{data['author']}|{data['rating']}|{data['text']}"
                previous = collected.get(key)
                if previous is None:
                    collected[key] = data
                    added += 1
                elif len(data['text']) > len(previous['text']):
                    collected[key] = data
            except Exception as error:
                failed_cards += 1
                print(f'[AVISO] Cartão alterado ou texto não expandido; nova tentativa na próxima rodada: {error}', flush=True)
        if failed_cards:
            failed_rounds += 1
            if failed_rounds >= 3:
                if warnings is not None and collected:
                    warnings.append('TEXT_EXPANSION_FAILED')
                    break
                raise RuntimeError('O Google Maps não liberou os comentários completos; tente novamente mais tarde.')
            await page.wait_for_timeout(wait_ms)
            continue
        failed_rounds = 0
        if len(collected) >= target:
            return list(collected.values())[:target]
        print(f'[SCROLL] Coletadas: {len(collected)} (+{added})', flush=True)
        stalls = stalls + 1 if added == 0 else 0
        if stalls >= stall_limit:
            break
        # Resolve the current ancestor each round: Maps can replace the panel.
        # Do not hover old cards afterwards, which scrolls the panel back upward.
        scrolled = await page.locator(REVIEW_SELECTOR).last.evaluate('''review => {
            let panel = review.parentElement;
            while (panel) {
                if (/auto|scroll/.test(getComputedStyle(panel).overflowY) && panel.scrollHeight > panel.clientHeight + 5) {
                    panel.scrollBy(0, Math.max(200, panel.clientHeight * 0.8));
                    return true;
                }
                panel = panel.parentElement;
            }
            return false;
        }''')
        if not scrolled:
            await page.locator(REVIEW_SELECTOR).last.scroll_into_view_if_needed(timeout=2500)
            await page.locator(REVIEW_SELECTOR).last.hover(timeout=2500)
            await page.mouse.wheel(0, 600)
        await page.wait_for_timeout(wait_ms)
    if not collected:
        raise RuntimeError('Nenhuma avaliação foi coletada na lista completa do Google Maps.')
    if expected is not None and len(collected) < min(expected, target):
        if warnings is None:
            raise RuntimeError(f'O Google Maps retornou uma coleta incompleta: {len(collected)} de {min(expected, target)} avaliações; tente novamente.')
        warnings.append('TARGET_NOT_REACHED')
    elif expected is None and len(collected) < target and warnings is not None:
        warnings.append('TARGET_NOT_REACHED')
    print(f'[INFO] Fim da lista acessível: {len(collected)} avaliações (meta: {target}).', flush=True)
    return list(collected.values())[:target]
