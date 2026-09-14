"""Smoke test público do coletor, sem IA nem gravação de avaliações no banco."""
import argparse
import asyncio
import re
from playwright.async_api import async_playwright
from maps_collector import prepare_reviews, collect_reviews


async def run(url, target):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'])
        context = await browser.new_context(locale='pt-BR', viewport={'width': 1280, 'height': 800},
            user_agent=f'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{browser.version} Safari/537.36')
        page = await context.new_page()
        page.set_default_timeout(5000)
        async def consent():
            button = page.get_by_role('button', name=re.compile(r'^(Aceitar tudo|Accept all|Concordar|Agree)$', re.I))
            if await button.count() and await button.first.is_visible():
                await button.first.click()
                await page.wait_for_timeout(1500)
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(4000)
            await consent()
            warnings = []
            expected = await prepare_reviews(page, consent, warnings=warnings)
            result = await collect_reviews(page, target, expected=expected, warnings=warnings)
            print(f'AVISOS: {warnings}')
            print(f'SMOKE OK: {len(result)} avaliações; {len({r["review_id"] for r in result if r["review_id"]})} IDs únicos; maior texto: {max(len(r["text"]) for r in result)} caracteres.')
        finally:
            await context.close()
            await browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--target', type=int, default=20)
    args = parser.parse_args()
    asyncio.run(run(args.url, args.target))
