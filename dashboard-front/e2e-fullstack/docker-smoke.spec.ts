import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("Docker permite cadastro, logout e login pelo frontend real", async ({ page, request }) => {
  const email = `smoke-${randomUUID()}@example.test`;
  const password = "password-smoke-123";

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/register");
  await page.getByLabel("Nome Completo").fill("Gestor Smoke");
  await page.getByLabel("Email Corporativo").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Criar Conta Grátis/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Olá, Gestor/i })).toBeVisible();

  await page.getByRole("button", { name: "Sair", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(email.toUpperCase());
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Entrar na Plataforma/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
