import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Sem page.route: navegador -> Nginx -> API real -> PostgreSQL -> subprocesso fixture.
async function register(page: Page) {
  const email = `e2e-${randomUUID()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Nome Completo").fill("Gestor Sintético");
  await page.getByLabel("Email Corporativo").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("password-e2e-123");
  await page.getByRole("button", { name: /Criar Conta Grátis/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}
async function headers(page: Page) {
  return { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem("@saas-tcc:token"))}` };
}
async function createStore(page: Page, name: string, path = "complete") {
  await page.getByRole("button", { name: "Nova Loja" }).click();
  await page.getByLabel("Nome do Estabelecimento").fill(name);
  await page.getByLabel("URL do Google Maps").fill(`https://maps.app.goo.gl/${path}`);
  const response = page.waitForResponse(r => r.url().endsWith("/api/establishments") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Criar e Minerar" }).click();
  const result = await response;
  expect(result.ok()).toBeTruthy();
  return result.json() as Promise<{ establishment: { id: number }; jobId: string }>;
}
async function waitJob(page: Page, jobId: string, state: string) {
  const authorization = await headers(page);
  await expect.poll(async () => {
    const response = await page.request.get(`/api/mining/status/${jobId}`, { headers: authorization });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).state;
  }, { timeout: 45_000 }).toBe(state);
  return (await page.request.get(`/api/mining/status/${jobId}`, { headers: authorization })).json();
}

test("cadastro, login, coleta, deduplicação, filtros, isolamento e exclusão", async ({ page }) => {
  const email = await register(page);
  await page.getByRole("button", { name: "Sair", exact: true }).filter({ visible: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email.toUpperCase());
  await page.getByLabel("Senha", { exact: true }).fill("password-e2e-123");
  await page.getByRole("button", { name: /Entrar na Plataforma/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const { establishment, jobId } = await createStore(page, "Loja E2E");
  await page.getByRole("button", { name: "Continuar em segundo plano" }).click();
  await page.getByRole("link", { name: "Minhas Lojas", exact: true }).click();
  await page.reload();
  const authorization = await headers(page);
  const latest = await page.request.get(`/api/establishments/${establishment.id}/latest-job`, { headers: authorization });
  expect((await latest.json()).jobId).toBe(jobId);
  expect((await waitJob(page, jobId, "COMPLETED")).reviewsImported).toBe(12);
  await page.getByRole("button", { name: "Recarregar status das lojas" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Semanal ativa" }).click();
  await expect(page.getByRole("button", { name: "Pausada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pausada", exact: true }).click();
  await expect(page.getByRole("button", { name: "Semanal ativa" })).toBeVisible();

  const refresh = page.waitForResponse(r => r.url().endsWith(`/${establishment.id}/refresh`));
  await page.getByRole("button", { name: "Atualizar agora" }).click();
  const secondJob = (await (await refresh).json()).jobId;
  await page.getByRole("button", { name: "Continuar em segundo plano" }).click();
  expect((await waitJob(page, secondJob, "COMPLETED")).reviewsImported).toBe(0);
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText("12 avaliações analisadas")).toBeVisible();
  await expect(page.getByText("Página 1 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await page.getByRole("button", { name: /^Negativo/ }).click();
  await expect(page.getByText("4 resultados")).toBeVisible();
  await page.getByRole("button", { name: /^Todos/ }).click();
  await page.getByPlaceholder("Buscar por autor ou texto...").fill("Cliente fictício 00");
  await expect(page.getByText("1 resultados")).toBeVisible();

  const other = await page.request.post("/api/auth/register", {
    data: { name: "Outra Conta", email: `other-${randomUUID()}@example.test`, password: "password-e2e-123" },
  });
  expect(other.ok()).toBeTruthy();
  const otherHeaders = { Authorization: `Bearer ${(await other.json()).token}` };
  expect(await (await page.request.get("/api/establishments", { headers: otherHeaders })).json()).toEqual([]);
  for (const path of [`/api/mining/status/${jobId}`, `/api/establishments/${establishment.id}/latest-job`,
    `/api/reviews/establishment/${establishment.id}`, `/api/reviews/stats?establishmentId=${establishment.id}`]) {
    const response = await page.request.get(path, { headers: otherHeaders });
    expect([403, 404]).toContain(response.status());
  }
  expect([403, 404]).toContain((await page.request.delete(`/api/establishments/${establishment.id}`, { headers: otherHeaders })).status());
  await page.getByRole("link", { name: "Minhas Lojas", exact: true }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir Loja E2E" }).click();
  await expect(page.getByText("Nenhum estabelecimento cadastrado")).toBeVisible();
  expect((await page.request.get(`/api/mining/status/${jobId}`, { headers: authorization })).status()).toBe(404);
  expect((await (await page.request.get("/api/reviews/stats", { headers: authorization })).json()).total).toBe(0);
});

test("coleta parcial e falha externa ficam distintas e visíveis após reload", async ({ page }) => {
  await register(page);
  const partial = await createStore(page, "Parcial E2E", "partial");
  await waitJob(page, partial.jobId, "COMPLETED");
  await expect(page.getByRole("heading", { name: "Coleta parcial" })).toBeVisible();
  await page.getByRole("button", { name: "Ver avaliações" }).click();
  await page.getByRole("link", { name: "Minhas Lojas", exact: true }).click();
  const failed = await createStore(page, "Falha E2E", "failure");
  await page.getByRole("button", { name: "Continuar em segundo plano" }).click();
  await waitJob(page, failed.jobId, "FAILED");
  await page.reload();
  await expect(page.getByText("Falhou", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Coleta parcial:/)).toBeVisible();
  await expect(page.getByText("Não foi possível concluir a mineração. Tente novamente em alguns minutos.")).toBeVisible();
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  const authorization = await headers(page);
  for (const id of [partial.establishment.id, failed.establishment.id]) {
    expect((await page.request.delete(`/api/establishments/${id}`, { headers: authorization })).status()).toBe(204);
  }
});
