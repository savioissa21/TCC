import unittest
from unittest.mock import AsyncMock, patch
from maps_collector import collect_reviews, expand_review, open_reviews_panel, sort_by_newest, prepare_reviews

try:
    from playwright.async_api import async_playwright
except ImportError:
    async_playwright = None


@unittest.skipIf(async_playwright is None, 'Instale playwright para executar os testes de DOM.')
class MapsCollectorTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch()
        self.page = await self.browser.new_page()

    async def asyncTearDown(self):
        await self.browser.close()
        await self.pw.stop()

    async def test_expands_customer_text_not_options_or_owner_response(self):
        for label in ['Ler mais', 'Ver mais', 'Mais', 'Read more', 'More']:
            with self.subTest(label=label):
                await self.page.set_content('''<div class="jftiEf" data-review-id="a">
                  <button onclick="window.wrong=true">Mais opções</button>
                  <span class="wiI7pd">Curto</span>
                  <button onclick="this.previousElementSibling.textContent='Comentário completo do cliente';this.remove()">LABEL</button>
                  <span class="wiI7pd">Resposta da empresa</span>
                  <button onclick="window.wrong=true">Ler mais</button></div>'''.replace('LABEL', label))
                await expand_review(await self.page.query_selector('.jftiEf'))
                self.assertEqual(await self.page.locator('.wiI7pd').first.inner_text(), 'Comentário completo do cliente')
                self.assertFalse(await self.page.evaluate('Boolean(window.wrong)'))

    async def test_scrolls_reviews_panel_past_five_with_virtualized_batches(self):
        await self.page.set_content('''<div style="overflow:auto;height:50px"><div style="height:500px">Outro painel</div></div>
          <div id="reviews" style="overflow-y:auto;height:200px;overflow-anchor:none"></div>
          <script>
          let start = 0;
          const panel = document.getElementById('reviews');
          function fill() {
            panel.innerHTML = Array.from({length:5}, (_,i) => `<div class="jftiEf" data-review-id="${start+i}" style="height:80px">
              <span class="d4r55">Autor ${start+i}</span><span class="kvMYJc" aria-label="5 estrelas"></span>
              <span class="wiI7pd">Texto ${start+i}</span></div>`).join('');
          }
          fill(); panel.addEventListener('scroll', () => {
            if(panel.scrollTop >= 150 && start < 10) {
              start += 5; fill(); requestAnimationFrame(() => panel.scrollTop=0);
            }
          });</script>''')
        result = await collect_reviews(self.page, 15, expected=15, wait_ms=250, stall_limit=8)
        self.assertEqual(len(result), 15)
        self.assertEqual(len({r['review_id'] for r in result}), 15)

    async def test_does_not_expand_details_on_star_only_reviews(self):
        await self.page.set_content('''<div class="jftiEf"><span class="kvMYJc" aria-label="5 estrelas"></span>
          <button onclick="window.wrong=true">Mais</button></div>''')
        await expand_review(await self.page.query_selector('.jftiEf'))
        self.assertFalse(await self.page.evaluate('Boolean(window.wrong)'))

    async def test_waits_for_delayed_expansion(self):
        await self.page.set_content('''<div class="jftiEf"><span class="wiI7pd">Curto</span>
          <button onclick="setTimeout(() => {this.previousElementSibling.textContent='Texto completo';this.remove()}, 400)">Ler mais</button></div>''')
        await expand_review(await self.page.query_selector('.jftiEf'))
        self.assertEqual(await self.page.locator('.wiI7pd').inner_text(), 'Texto completo')

    async def test_failed_expansion_does_not_become_success_when_target_is_reached(self):
        await self.page.set_content('<div class="jftiEf" data-review-id="ok"><span class="wiI7pd">Completo</span></div>'
            '<div class="jftiEf" data-review-id="bad"><span class="wiI7pd">Truncado</span></div>')
        async def expand(card):
            if await card.get_attribute('data-review-id') == 'bad':
                raise RuntimeError('Expansão falhou')
        with patch('maps_collector.expand_review', side_effect=expand):
            with self.assertRaisesRegex(RuntimeError, 'comentários completos'):
                await collect_reviews(self.page, 1, wait_ms=10)
            warnings = []
            result = await collect_reviews(self.page, 1, wait_ms=10, warnings=warnings)
            self.assertEqual([item['review_id'] for item in result], ['ok'])
            self.assertEqual(warnings, ['TEXT_EXPANSION_FAILED'])

    async def test_blocked_sort_is_retried_and_reported(self):
        await self.page.set_content('<span>196 avaliações</span>')
        with patch('maps_collector.open_reviews_panel', new=AsyncMock(return_value=196)), \
             patch('maps_collector.sort_by_newest', new=AsyncMock(side_effect=RuntimeError('Login'))), \
             patch.object(self.page, 'reload', new=AsyncMock()), \
             patch.object(self.page, 'wait_for_timeout', new=AsyncMock()):
            with self.assertRaisesRegex(RuntimeError, 'não liberou a lista completa'):
                await prepare_reviews(self.page, AsyncMock())
            self.assertEqual(self.page.reload.await_count, 2)

    async def test_preview_is_reloaded_until_full_list_available(self):
        # No sort control: five preview cards must never be accepted as the list.
        page = AsyncMock()
        from unittest.mock import MagicMock
        page.locator = MagicMock()
        page.locator.return_value.count = AsyncMock(return_value=0)
        page.locator.return_value.first.is_visible = AsyncMock(return_value=False)
        with self.assertRaisesRegex(RuntimeError, 'lista completa'):
            await open_reviews_panel(page, AsyncMock())
        self.assertEqual(page.reload.await_count, 2)

    async def test_imports_accessible_reviews_with_warning_when_sort_is_blocked(self):
        await self.page.set_content('<span>196 avaliações</span><div class="jftiEf"><span class="wiI7pd">Texto público completo</span></div>')
        warnings = []
        with patch('maps_collector.open_reviews_panel', new=AsyncMock(return_value=196)), \
             patch('maps_collector.sort_by_newest', new=AsyncMock(side_effect=RuntimeError('Login'))), \
             patch.object(self.page, 'reload', new=AsyncMock()), \
             patch.object(self.page, 'wait_for_timeout', new=AsyncMock()):
            expected = await prepare_reviews(self.page, AsyncMock(), warnings=warnings)
        result = await collect_reviews(self.page, 100, expected=expected, warnings=warnings, wait_ms=10, stall_limit=1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['text'], 'Texto público completo')
        self.assertEqual(warnings, ['SORT_UNCONFIRMED', 'TARGET_NOT_REACHED'])

    async def test_empty_page_still_fails_in_partial_mode(self):
        warnings = []
        with patch('maps_collector.open_reviews_panel', new=AsyncMock(return_value=None)), \
             patch('maps_collector.sort_by_newest', new=AsyncMock(side_effect=RuntimeError('Login'))), \
             patch.object(self.page, 'reload', new=AsyncMock()), \
             patch.object(self.page, 'wait_for_timeout', new=AsyncMock()):
            with self.assertRaisesRegex(RuntimeError, 'não liberou a lista completa'):
                await prepare_reviews(self.page, AsyncMock(), warnings=warnings)
        self.assertEqual(warnings, [])

    async def test_sort_click_without_reviews_reopens_readable_preview(self):
        from unittest.mock import MagicMock
        page = MagicMock()
        page.get_by_text.return_value.all_text_contents = AsyncMock(return_value=[])
        page.get_by_role.return_value.count = AsyncMock(return_value=0)
        page.keyboard.press = AsyncMock()
        page.locator.return_value.first.wait_for = AsyncMock(side_effect=RuntimeError('Empty panel'))
        page.locator.return_value.first.is_visible = AsyncMock(side_effect=[False, True])
        page.reload = AsyncMock()
        page.wait_for_timeout = AsyncMock()
        warnings = []
        with patch('maps_collector.open_reviews_panel', new=AsyncMock(return_value=100)), \
             patch('maps_collector.sort_by_newest', new=AsyncMock()):
            self.assertEqual(await prepare_reviews(page, AsyncMock(), warnings=warnings), 100)
        self.assertEqual(warnings, ['SORT_UNCONFIRMED'])
        self.assertEqual(page.reload.await_count, 3)

    async def test_waits_for_async_sort_menu(self):
        await self.page.set_content('''<button aria-label="Classificar" onclick="setTimeout(() => {
          const item=document.createElement('div'); item.setAttribute('role','menuitemradio');
          item.textContent='Mais recentes'; item.onclick=()=>window.sorted=true; document.body.append(item);
          }, 200)">Classificar</button>''')
        await sort_by_newest(self.page)
        self.assertTrue(await self.page.evaluate('window.sorted'))

    async def test_real_five_review_store_succeeds_but_partial_five_fails(self):
        await self.page.set_content(''.join(f'<div class="jftiEf" data-review-id="{i}"><span class="wiI7pd">Texto</span></div>' for i in range(5)))
        self.assertEqual(len(await collect_reviews(self.page, 100, expected=5, wait_ms=10, stall_limit=1)), 5)
        with self.assertRaisesRegex(RuntimeError, 'coleta incompleta: 5 de 100'):
            await collect_reviews(self.page, 100, expected=200, wait_ms=10, stall_limit=1)


if __name__ == '__main__':
    unittest.main()
