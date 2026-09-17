# Matriz de requisitos e evidências — NEXO

Referência inicial: plano fornecido pelo usuário e commit `18eb485`.
O `proposta2026.pdf` e o fonte da monografia não foram disponibilizados nesta
sessão; a correspondência com o PDF ainda exige leitura e confirmação.
Resultados históricos em VALIDACAO_TECNICA.md não equivalem a execução atual.

| Requisito | Código | Verificação | Situação inicial |
|---|---|---|---|
| Spring Boot / Java 21 | dashboard-api | Maven, controllers e serviços | baseline em execução |
| PostgreSQL 15 / migrations | db/migration, Compose | H2; adicionar PostgreSQL real | Docker inativo |
| SPA React / TypeScript / Tailwind | dashboard-front | lint, Vitest, build, Chromium | contratos e mobile a corrigir |
| Indicadores dinâmicos | ReviewService, Recharts | consultas, seleção de loja, E2E | testes existentes |
| Coleta Playwright | maps_collector.py | DOM local e smoke externo | baseline DOM bloqueado pelo sandbox |
| ABSA híbrida | aspect_extractor.py, bertimbau_absa.py | regressões, checkpoint e avaliação reservada | checkpoint ausente |
| Integração persistente | MiningJobService, MiningProcessRunner | recuperação, timeout, deduplicação | unitários existentes; E2E real pendente |
| Autenticação e isolamento | security, controllers | duas contas, JWT, CORS, IDOR | normalização e filtro a corrigir |
| Usabilidade e acessibilidade | componentes React | teclado e 360/768/1024/1440 px | validação pendente |
| Docker reproduzível | Dockerfile, Compose | build sem JAR local e healthchecks | multi-stage pendente |
| Evidência científica | RESULTADOS_TREINO_ABSA.md | métricas, splits, dois anotadores | números históricos; nova amostra humana pendente |
| Protótipo Figma / monografia | artefatos externos | comparação e revisão acadêmica | artefatos ausentes |

## Regras de evidência

- Testes com API simulada comprovam interface, não integração.
- Fixture de mineração comprova orquestração/importação, não Maps ou IA reais.
- Nenhuma anotação humana, inferência real ou métrica deve ser fabricada.
- A conclusão integral depende do smoke com checkpoint oficial e fonte pública,
  de PostgreSQL real, da proposta e das evidências acadêmicas externas.
