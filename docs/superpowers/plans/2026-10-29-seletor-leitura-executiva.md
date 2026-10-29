# Seletor editorial e leitura executiva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o seletor nativo do dashboard por uma bandeja acessível e acrescentar um resumo que indique prioridade, base analisada e movimento recente.

**Architecture:** Funções puras calculam a leitura executiva a partir de `ReviewStats` e `EstablishmentSummary[]`; um componente apresenta os três resultados. Um segundo componente encapsula toda a interação do `combobox`, deixando `Dashboard.tsx` responsável apenas pelo estado selecionado e carregamento dos dados.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide, Vitest, Testing Library e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-seletor-leitura-executiva-design.md`

## Global Constraints

- Não criar endpoints, dependências ou novas inferências de IA.
- Usar o limite existente de 10 menções para indicar um aspecto prioritário.
- Chamar a relação com o total do Google de “cobertura textual indicativa” e explicar que o total pode incluir avaliações sem comentário.
- Não usar “tendência” para descrever uma única coleta.
- Preservar acessibilidade por teclado, movimento reduzido e funcionamento a partir de 320 px.
- Manter a direção Executivo editorial e os contratos atuais da API.

## Review Focus

- Total do Google nulo ou zero: a base analisada deve mostrar os comentários sem inventar percentual de cobertura; fixado na Task 1.
- Comentários analisados maiores que o total informado: a cobertura indicativa deve ser limitada a 100%; fixado na Task 1.
- Nenhum aspecto com 10 menções: não apontar problema como prioridade; fixado na Task 1.
- Datas ausentes ou inválidas e zero avaliações novas: apresentar estado neutro legível; fixado na Task 1.
- Nome longo, muitas lojas e navegação por teclado: bandeja não pode transbordar e deve manter foco e seleção; fixado nas Tasks 2 e 3.

---

### Task 1: Cálculos e faixa de leitura executiva

**Files:**
- Create: `dashboard-front/src/lib/executiveSummary.ts`
- Create: `dashboard-front/src/lib/executiveSummary.test.ts`
- Create: `dashboard-front/src/components/dashboard/ExecutiveSummary.tsx`
- Create: `dashboard-front/src/components/dashboard/ExecutiveSummary.test.tsx`

**Interfaces:**
- Consumes: `ReviewStats` e `EstablishmentSummary` de `src/types/index.ts`.
- Produces: `MIN_RELIABLE_ASPECT_MENTIONS = 10`; `buildExecutiveSummary(stats: ReviewStats, stores: EstablishmentSummary[]): ExecutiveSummaryData`; componente `ExecutiveSummary({ stats, stores, isLoading })`.
- `ExecutiveSummaryData` contém `priority`, `coverage` e `recentMovement`, cada campo já com valores necessários para apresentação sem recalcular no JSX.

- [x] **Step 1: Escrever testes falhando das funções puras**

Cobrir: menor aspecto com `total >= 10`; ausência de aspecto confiável; percentual de cobertura normal e limitado a 100%; Google total nulo/zero; soma de `lastNewReviews`; data válida mais recente; datas ausentes ou inválidas.

- [x] **Step 2: Executar o teste das funções**

Run: `npm test -- src/lib/executiveSummary.test.ts`

Expected: FAIL porque `executiveSummary.ts` ainda não existe.

- [x] **Step 3: Implementar `buildExecutiveSummary`**

Usar somente dados do escopo recebido. Não mutar `stats.aspects` nem `stores`; limitar cobertura a `[0, 100]`; ignorar datas inválidas ao encontrar a atualização mais recente.

- [x] **Step 4: Executar o teste das funções**

Run: `npm test -- src/lib/executiveSummary.test.ts`

Expected: PASS.

- [x] **Step 5: Escrever teste falhando de `ExecutiveSummary`**

Verificar os títulos “Onde agir”, “Base analisada” e “Movimento recente”; prioridade com percentual e número de menções; explicação sobre avaliações sem comentário; estado sem base confiável; skeleton com `role="status"`.

- [x] **Step 6: Implementar `ExecutiveSummary`**

Criar três blocos semânticos dentro de uma seção `aria-label="Leitura executiva"`, usando texto e ícone além de cor. Manter a mesma geometria no skeleton.

- [x] **Step 7: Executar testes da Task 1 e build**

Run: `npm test -- src/lib/executiveSummary.test.ts src/components/dashboard/ExecutiveSummary.test.tsx`; depois `npm run build`.

Expected: PASS.

- [x] **Step 8: Commit**

`git commit -m "feat(front): add decision-oriented executive summary"`

---

### Task 2: Bandeja personalizada de estabelecimentos

**Files:**
- Create: `dashboard-front/src/components/dashboard/EstablishmentSelector.tsx`
- Create: `dashboard-front/src/components/dashboard/EstablishmentSelector.test.tsx`

**Interfaces:**
- Consumes: `EstablishmentSummary[]`, `selectedId?: number`, `onChange(id?: number): void`.
- Produces: `EstablishmentSelector`, um `combobox` nomeado “Estabelecimento” com `listbox` e opções para visão consolidada e cada loja.

- [x] **Step 1: Escrever teste falhando do comportamento básico**

Verificar acionador com `role="combobox"`, `aria-expanded`, abertura por clique, opção consolidada, dados compactos de loja, seleção que chama `onChange`, fechamento e marcação `aria-selected`.

- [x] **Step 2: Escrever testes falhando de teclado e bordas**

Cobrir abertura com `ArrowDown`, navegação por setas, `Home`, `End`, seleção por `Enter`, fechamento por `Escape` com foco devolvido, clique fora e nome longo truncado sem perder `title`.

- [x] **Step 3: Executar teste do seletor**

Run: `npm test -- src/components/dashboard/EstablishmentSelector.test.tsx`

Expected: FAIL porque o componente ainda não existe.

- [x] **Step 4: Implementar `EstablishmentSelector`**

Usar botão acionador, bandeja posicionada, papéis ARIA e referências para foco. Não adicionar campo de busca nem dependência externa. Mostrar estado, comentários analisados, satisfação e nota Google quando disponível.

- [x] **Step 5: Executar teste do seletor e build**

Run: `npm test -- src/components/dashboard/EstablishmentSelector.test.tsx`; depois `npm run build`.

Expected: PASS.

- [x] **Step 6: Commit**

`git commit -m "feat(front): replace native store select with editorial tray"`

---

### Task 3: Integração, responsividade e validação real

**Files:**
- Modify: `dashboard-front/src/pages/Dashboard.tsx`
- Modify: `dashboard-front/src/components/dashboard/DashboardStates.test.tsx`
- Modify: `dashboard-front/e2e/dashboard.spec.ts`
- Modify: `dashboard-front/e2e-fullstack/docker-smoke.spec.ts` somente se o nome acessível do fluxo mudar.

**Interfaces:**
- Consumes: `EstablishmentSelector` da Task 2 e `ExecutiveSummary` da Task 1.
- Produces: dashboard integrado sem `<select>` nativo e com leitura executiva restrita ao escopo escolhido.

- [x] **Step 1: Atualizar teste do dashboard para o novo contrato**

Verificar `combobox` “Estabelecimento”, faixa “Leitura executiva”, escopo consolidado e individual, além do skeleton durante carregamento.

- [x] **Step 2: Integrar os componentes em `Dashboard.tsx`**

Substituir o `<select>` e `ChevronDown`; centralizar a troca de escopo em uma função que limpa indicadores, atualiza `selectedStore` e dispara a busca. Passar somente as lojas do escopo para `ExecutiveSummary`.

- [x] **Step 3: Atualizar Playwright**

Trocar `selectOption` por abertura do `combobox` e clique em `option`. Verificar bandeja e faixa executiva em 320 px, ausência de overflow e seleção consolidada/individual.

- [x] **Step 4: Executar validação completa do frontend**

Run: `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

Expected: todos com exit code 0; Vitest e Playwright sem falhas.

- [x] **Step 5: Reconstruir Docker e executar smoke**

Reutilizar o checkpoint local sem alterar `.env`; verificar PostgreSQL, API e frontend saudáveis e executar `docker-smoke.spec.ts` contra `http://127.0.0.1`.

- [x] **Step 6: Revisar diff e arquivos versionados**

Run: `git diff --check`, `git status --short` e diff contra `main`.

Expected: nenhuma credencial, checkpoint, relatório Playwright ou arquivo científico fora do escopo.

- [x] **Step 7: Commit**

`git commit -m "test(front): validate executive decision workflow"`
