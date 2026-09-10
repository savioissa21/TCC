import { expect, test, type Page, type Route } from "@playwright/test";

const token = [
  "eyJhbGciOiJub25lIn0",
  "eyJzdWIiOiJnZXN0b3JAZXhhbXBsZS5jb20iLCJpc3MiOiJUZXN0ZSIsImV4cCI6NDEwMjQ0NDgwMH0",
  "signature",
].join(".");

async function mockApi(page: Page) {
  let statusCalls = 0;
  await page.route("http://localhost:8085/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (url.pathname === "/auth/login" && request.method() === "POST") {
      await json({ name: "Gestor Teste", token });
      return;
    }
    if (url.pathname === "/establishments" && request.method() === "POST") {
      await json({
        establishment: { id: 7, name: "Pizzaria Teste", mapsUrl: "https://maps.app.goo.gl/teste" },
        jobId: "job-1",
      });
      return;
    }
    if (url.pathname === "/mining/status/job-1") {
      statusCalls += 1;
      await json(statusCalls === 1
        ? { state: "QUEUED", message: "Aguardando na fila de mineração...", reviewsImported: 0,
            updatedAt: "2026-09-09T12:00:00" }
        : { state: "COMPLETED", message: "Atualização concluída com sucesso!", reviewsImported: 3,
            updatedAt: "2026-09-09T12:01:00" });
      return;
    }
    if (url.pathname === "/api/reviews/stats") {
      await json({ total: 0, positive: 0, negative: 0, neutral: 0, avgRating: 0, score: 0, aspects: [] });
      return;
    }
    if (url.pathname === "/api/reviews") {
      await json({ content: [], number: 0, size: 8, totalElements: 0, totalPages: 0, last: true });
      return;
    }
    if (url.pathname === "/establishments" && request.method() === "GET") {
      await json([]);
      return;
    }
    await json({ error: `Rota não simulada: ${url.pathname}` }, 404);
  });
}

test("login e mineração percorrem o fluxo principal", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("gestor@example.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: /Entrar na Plataforma/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Olá, Gestor/i })).toBeVisible();

  await page.getByRole("button", { name: "Nova Loja" }).click();
  await page.getByPlaceholder("Ex: Pizzaria do João").fill("Pizzaria Teste");
  await page.getByPlaceholder("https://maps.app.goo.gl/...").fill("https://maps.app.goo.gl/teste");
  await page.getByRole("button", { name: "Criar e Minerar" }).click();

  await expect(page.getByText("Aguardando na fila de mineração...")).toBeVisible();
  await expect(page.getByText("Mineração concluída!")).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/3 avaliações novas importadas/)).toBeVisible();
});
