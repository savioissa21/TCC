# Frontend NEXO

Interface React 19, TypeScript e Vite do dashboard de avaliações.

## Desenvolvimento local

Com a API em `http://localhost:8080`:

```bash
npm ci
npm run dev
```

O navegador chama somente caminhos `/api`. Em desenvolvimento o Vite encaminha
esses caminhos para a API; no Docker, o Nginx faz o mesmo encaminhamento. Não é
necessário editar uma URL no código ao alternar entre os ambientes.

## Verificação

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`test:e2e` mantém testes rápidos de interface com a API simulada. A prova de
integração real usa o ambiente descartável da raiz:

```bash
docker compose -f compose.e2e.yml up -d --build --wait --wait-timeout 180
cd dashboard-front
npm run test:e2e:fullstack
cd ..
docker compose -f compose.e2e.yml down -v
```

Nesse segundo fluxo, frontend, Nginx, API e PostgreSQL são reais; somente o
fornecedor externo de avaliações e a inferência são substituídos por fixture.
