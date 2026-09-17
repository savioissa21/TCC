import { describe, expect, it } from "vitest";
import type { InternalAxiosRequestConfig } from "axios";
import { api } from "../lib/api";
import { STORAGE_KEYS } from "../lib/storage";

describe("contrato HTTP de mesma origem", () => {
  it("envia login sem token e consultas autenticadas pelo prefixo /api", async () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, "token-descartavel");
    const requests: { url: string; authorization: unknown }[] = [];
    const adapter = async (config: InternalAxiosRequestConfig) => {
      requests.push({ url: api.getUri(config), authorization: config.headers.Authorization });
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    };
    await api.post("/auth/login", {}, { adapter });
    await api.get("/establishments", { adapter });
    await api.get("/api/reviews", { adapter });
    expect(requests).toEqual([
      { url: "/api/auth/login", authorization: undefined },
      { url: "/api/establishments", authorization: "Bearer token-descartavel" },
      { url: "/api/api/reviews", authorization: "Bearer token-descartavel" },
    ]);
    localStorage.clear();
  });
});
