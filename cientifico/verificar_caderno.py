"""Smoke test de navegador do caderno gerado, somente arquivos locais."""
import argparse
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright


async def run(folder: Path, report_path: Path):
    report = json.loads(report_path.read_text(encoding="utf-8"))
    draft = json.loads((folder / "rascunho_ia.json").read_text(encoding="utf-8"))
    errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto((folder / "COMPARACAO_MODELOS.html").resolve().as_uri())
        assert await page.locator('section[data-review]').count() == report["review_count"]
        assert await page.locator('tr[data-mention]').count() == report["mention_count"]
        for excluded in draft.get("excluded_mentions", []):
            assert not any(m["review_id"] == excluded["review_id"] and m["text"] == excluded["text"] for m in report["mentions"])
            assert not any(m["review_id"] == excluded["review_id"] and m["text"] == excluded["text"] for m in report["operational_candidates"])
        if draft.get("scope_revision"):
            assert await page.get_by_role('heading', name='Protocolo v0.2: não experimentação fora das menções').count() == 1
        await page.get_by_role('button', name='Modelos divergem', exact=True).click()
        assert await page.locator('tr[data-mention]:visible').count() == report["metrics"]["models_disagree"]
        await page.get_by_role('button', name='Dúvidas do caderno', exact=True).click()
        assert await page.locator('tr[data-mention]:visible').count() == sum(m["doubt_ai"] == "Sim" for m in report["mentions"])
        await page.get_by_role('button', name='Todos', exact=True).click()
        first_id = report["mentions"][0]["review_id"]
        await page.locator('#comparison-search').fill(first_id)
        assert await page.locator('tr[data-mention]:visible').count() == sum(m["review_id"] == first_id for m in report["mentions"])
        await page.locator('#comparison-search').fill('')
        await page.locator('details.operational summary').first.click()
        assert await page.locator('details.operational').first.locator('.operational-table').is_visible()
        await page.screenshot(path=str(report_path.parent / 'caderno_desktop.png'), full_page=False)
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.screenshot(path=str(report_path.parent / 'caderno_mobile.png'), full_page=False)
        assert not errors, errors
        await browser.close()
    print(f"OK: {report['review_count']} avaliações, {report['mention_count']} linhas; filtros, busca e painel operacional funcionando; sem erros JavaScript.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('report', type=Path)
    args = parser.parse_args()
    asyncio.run(run(args.folder, args.report))
