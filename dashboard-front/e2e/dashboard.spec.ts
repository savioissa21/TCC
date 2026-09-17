import { expect, test, type Page, type Route } from "@playwright/test";

const token = [
  "eyJhbGciOiJub25lIn0",
  "eyJzdWIiOiJnZXN0b3JAZXhhbXBsZS5jb20iLCJpc3MiOiJUZXN0ZSIsImV4cCI6NDEwMjQ0NDgwMH0",
  "signature",
].join(".");

async function mockApi(page: Page) {
  let statusCalls = 0;
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    url.pathname = url.pathname.replace(/^\/api/, "");
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
    if (url.pathname === "/api/reviews" || url.pathname === "/api/reviews/establishment/7") {
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

test("menu móvel navega, marca a rota e encerra a sessão", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockApi(page);
  await page.goto("/login");
  await expect(page.getByText("Esqueceu sua senha?")).toHaveCount(0);
  await page.locator('input[type="email"]').fill("mobile@example.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: /Entrar na Plataforma/ }).click();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  const nav = page.getByRole("navigation", { name: "Menu principal móvel" });
  await nav.getByRole("link", { name: "Minhas Lojas" }).click();
  await expect(page).toHaveURL(/\/minhas-lojas$/);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(nav.getByRole("link", { name: "Minhas Lojas" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link")).toHaveCount(2);
  await nav.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.locator("#mobile-menu").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

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

test("filtro de loja mantém avaliações, paginação e indicadores no mesmo escopo", async ({ page }) => {
  await page.addInitScript(({ token }) => {
    localStorage.setItem("@saas-tcc:token", token);
    localStorage.setItem("@saas-tcc:user", JSON.stringify({ id: "u", name: "Gestor", email: "gestor@example.com" }));
  }, { token });
  const stores = [1, 2].map(id => ({ id, name: `Loja ${id}`, mapsUrl: "https://maps.google.com",
    reviewCount: id === 1 ? 9 : 1, avgRating: id === 1 ? 5 : 1, satisfactionScore: id === 1 ? 100 : 0,
    lastMiningMessage: id === 1 ? "Coleta parcial: ordenação não confirmada." : "Concluída" }));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace(/^\/api/, "");
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.pathname === "/establishments") return json(stores);
    if (url.pathname === "/api/reviews/stats") {
      const id = url.searchParams.get("establishmentId");
      return json({ total: id === "1" ? 9 : id === "2" ? 1 : 10,
        positive: id === "2" ? 0 : 9, negative: id === "1" ? 0 : 1,
        neutral: 0, avgRating: id === "1" ? 5 : id === "2" ? 1 : 4.6,
        score: id === "1" ? 100 : id === "2" ? 0 : 90, aspects: [] });
    }
    if (url.pathname.startsWith("/api/reviews")) {
      const id = url.pathname.endsWith("/1") ? 1 : url.pathname.endsWith("/2") ? 2 : undefined;
      const number = Number(url.searchParams.get("page") || 0);
      const ids = id ? [id] : [1, 2];
      return json({ content: ids.map(i => ({ id: `r${i}-${number}`, author: `Cliente ${i}`, text: `Avaliação exclusiva ${i}`,
        establishmentName: `Loja ${i}`, establishmentId: i, rating: i === 1 ? 5 : 1,
        overallSentiment: i === 1 ? "Positivo" : "Negativo", aspects: [] })),
        number, size: 8, totalElements: id === 1 ? 9 : id === 2 ? 1 : 10,
        totalPages: id === 2 ? 1 : 2, last: id === 2 || number === 1 });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/dashboard");
  await expect(page.getByText('"Avaliação exclusiva 1"')).toBeVisible();
  await expect(page.getByText('"Avaliação exclusiva 2"')).toBeVisible();
  await page.getByLabel("Estabelecimento", { exact: true }).selectOption("1");
  await expect(page.getByText("9 avaliações analisadas")).toBeVisible();
  await expect(page.getByText(/Coleta parcial: ordenação/)).toBeVisible();
  await expect(page.getByText('"Avaliação exclusiva 2"')).toHaveCount(0);
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await page.getByLabel("Estabelecimento", { exact: true }).selectOption("2");
  await expect(page.getByText("1 avaliações analisadas")).toBeVisible();
  await expect(page.getByText(/Coleta parcial: ordenação/)).toHaveCount(0);
  await expect(page.getByText("Página 1 de 1")).toBeVisible();
  await expect(page.getByText('"Avaliação exclusiva 1"')).toHaveCount(0);
  await expect(page.getByText('"Avaliação exclusiva 2"')).toBeVisible();
  await page.getByLabel("Estabelecimento", { exact: true }).selectOption("all");
  await expect(page.getByText("10 avaliações analisadas")).toBeVisible();
  await expect(page.getByText('"Avaliação exclusiva 1"')).toBeVisible();
});
