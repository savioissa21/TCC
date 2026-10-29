# NEXO Executive Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma identidade Executivo editorial coesa em todo o frontend NEXO, com movimento funcional, acessibilidade e todos os fluxos atuais preservados.

**Architecture:** O redesign parte de tokens CSS globais e pequenas primitivas visuais reutilizáveis. Páginas e componentes existentes continuam responsáveis pelos mesmos dados e ações; apenas estrutura de apresentação, hierarquia e animação mudam. Framer Motion orquestra entradas e listas, enquanto interações simples permanecem em CSS.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Framer Motion 12, Recharts 3, Lucide React, Vitest, Testing Library e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-redesign-executivo-editorial-design.md`

## Global Constraints

- Manter React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts e Lucide; não adicionar biblioteca visual externa.
- Não alterar endpoints, hooks, serviços, tipos de domínio nem formatos de resposta da API.
- Manter todas as telas utilizáveis a partir de 320 px e alvos de toque com pelo menos 44 px.
- Garantir contraste WCAG AA, foco visível, labels e `aria-live` para estados dinâmicos.
- Usar `#F4F3ED` como fundo, `#13201D` como tinta, `#FCFCF8` como superfície e `#23845E` como acento principal.
- Respeitar `prefers-reduced-motion`; nenhuma animação deve ser indispensável para compreender o estado.

## Review Focus

- Em 320 px, seletor de loja, cartões, modais e navegação não podem causar rolagem horizontal; fixado pelo teste Playwright da Task 6.
- Com `prefers-reduced-motion: reduce`, entradas e transições não podem esconder ou atrasar conteúdo; fixado pelo Playwright da Task 6, além da regra CSS da Task 1.
- Estados sem lojas, sem avaliações, carregando e falha devem continuar explicando a próxima ação; fixado pelos testes de dashboard da Task 4.
- Menu móvel deve manter nome acessível, fechamento por Escape e saída da conta; fixado pelos testes da Task 2 e pelo E2E existente.
- Progresso real da mineração, coleta parcial e falhas de rede não podem ser substituídos por animação simulada; fixado pelos testes existentes e complementação da Task 5.

---

## File Map

**Create**

- `dashboard-front/src/lib/motion.ts`: variantes e transições compartilhadas.
- `dashboard-front/src/components/ui/editorial.tsx`: `EditorialLabel`, `Surface` e `MetricPanel`.
- `dashboard-front/src/components/ui/editorial.test.tsx`: semântica e acessibilidade das primitivas.
- `dashboard-front/src/components/layout/AuthShell.tsx`: moldura única de login e cadastro.
- `dashboard-front/src/components/layout/AppLayout.test.tsx`: navegação móvel e landmarks.
- `dashboard-front/src/components/dashboard/DashboardStates.test.tsx`: estados vazio e carregando.

**Modify**

- `dashboard-front/src/index.css`, `tailwind.config.js`: tokens, textura, foco, movimento reduzido e utilitários do tema.
- `dashboard-front/src/components/ui/{button,card,input,textarea,avatar,ToastContainer,typography}.tsx`: linguagem base.
- `dashboard-front/src/components/layout/{AppLayout,Sidebar,MobileNav}.tsx`, `routes/PrivateRoute.tsx`: moldura autenticada.
- `dashboard-front/src/pages/{Login,Register,Dashboard,MinhasLojas}.tsx`: composição das jornadas.
- `dashboard-front/src/components/dashboard/{DashboardHeader,StatsGrid,ReviewFeed,ReviewCard,InsightsSidebar}.tsx`: hierarquia do painel.
- `dashboard-front/src/components/modals/{CreateEstablishmentModal,MiningProgressModal}.tsx`: modais editoriais.
- Testes unitários e E2E existentes somente quando nomes acessíveis ou estrutura intencional mudarem.

### Task 1: Fundação visual, primitivas e movimento

**Files:**
- Create: `dashboard-front/src/lib/motion.ts`
- Create: `dashboard-front/src/components/ui/editorial.tsx`
- Create: `dashboard-front/src/components/ui/editorial.test.tsx`
- Modify: `dashboard-front/src/index.css`
- Modify: `dashboard-front/tailwind.config.js`
- Modify: `dashboard-front/src/components/ui/button.tsx`
- Modify: `dashboard-front/src/components/ui/card.tsx`
- Modify: `dashboard-front/src/components/ui/input.tsx`
- Modify: `dashboard-front/src/components/ui/textarea.tsx`
- Modify: `dashboard-front/src/components/ui/avatar.tsx`
- Modify: `dashboard-front/src/components/ui/ToastContainer.tsx`
- Modify: `dashboard-front/src/components/ui/typography.tsx`

**Interfaces:**
- Produces: `EditorialLabel(props: HTMLAttributes<HTMLParagraphElement>)`, `Surface(props: HTMLAttributes<HTMLElement> & { as?: ElementType })`, `MetricPanel({ label, value, detail, icon, tone })`.
- Produces: `pageReveal`, `staggerContainer`, `staggerItem` compatíveis com `motion` e uma duração máxima de 0,5 s.

- [x] **Step 1:** Criar `editorial.test.tsx` verificando que `EditorialLabel` renderiza texto, `Surface` aceita elemento semântico e `MetricPanel` associa rótulo, valor e detalhe sem depender de cor.
- [x] **Step 2:** Executar `npm test -- --run src/components/ui/editorial.test.tsx`; esperado: FAIL porque o módulo não existe.
- [x] **Step 3:** Implementar tokens HSL equivalentes à paleta da especificação em `index.css` e `tailwind.config.js`, incluindo `--ease-editorial`, números tabulares, textura discreta, foco visível e regra `prefers-reduced-motion`.
- [x] **Step 4:** Implementar as três primitivas em `editorial.tsx` e variantes em `motion.ts`; atualizar os componentes UI básicos para consumir os tokens sem alterar suas props públicas.
- [x] **Step 5:** Executar `npm test -- --run src/components/ui/editorial.test.tsx` e `npm run build`; esperado: PASS.
- [x] **Step 6:** Commit: `feat(front): establish executive editorial design system`.

### Task 2: Moldura, sidebar e navegação móvel

**Files:**
- Create: `dashboard-front/src/components/layout/AppLayout.test.tsx`
- Modify: `dashboard-front/src/components/layout/AppLayout.tsx`
- Modify: `dashboard-front/src/components/layout/Sidebar.tsx`
- Modify: `dashboard-front/src/components/layout/MobileNav.tsx`
- Modify: `dashboard-front/src/routes/PrivateRoute.tsx`

**Interfaces:**
- Consumes: `Surface`, `EditorialLabel` e variantes de `motion.ts`.
- Produces: os mesmos `<Outlet>`, links `/dashboard` e `/minhas-lojas`, ação `Sair` e nomes acessíveis atuais.

- [x] **Step 1:** Criar `AppLayout.test.tsx` com router e autenticação simulados; afirmar `navigation` com nome “Navegação principal”, `main`, link ativo, botão “Abrir menu”, fechamento por Escape e foco devolvido ao botão.
- [x] **Step 2:** Executar o teste isolado; esperado: falha porque a sidebar atual não nomeia a navegação principal.
- [x] **Step 3:** Reformular AppLayout, Sidebar, MobileNav e PrivateRoute com sidebar verde-marinho, fundo marfim, navegação clara, drawer móvel e carregamento coerente; preservar rotas e logout.
- [x] **Step 4:** Executar `npm test -- --run src/components/layout/AppLayout.test.tsx` e `npm run build`; esperado: PASS.
- [x] **Step 5:** Commit: `feat(front): redesign application navigation shell`.

### Task 3: Jornada de autenticação

**Files:**
- Create: `dashboard-front/src/components/layout/AuthShell.tsx`
- Create: `dashboard-front/src/components/layout/AuthShell.test.tsx`
- Modify: `dashboard-front/src/pages/Login.tsx`
- Modify: `dashboard-front/src/pages/Register.tsx`

**Interfaces:**
- Produces: `AuthShell({ eyebrow, title, description, children, footer })` com um único `main` e `h1` por tela.
- Preserva: labels de Email/Senha/Nome, textos dos botões, chamadas `signIn`/`register` e redirecionamentos.

- [x] **Step 1:** Criar teste afirmando que AuthShell expõe `main`, um `h1`, conteúdo de formulário e argumento de rodapé.
- [x] **Step 2:** Executar o teste; esperado: FAIL por módulo ausente.
- [x] **Step 3:** Implementar o layout dividido em desktop e formulário direto no mobile, com painel narrativo, assinatura visual e entrada escalonada.
- [x] **Step 4:** Migrar Login e Register para AuthShell sem mudar validação, nomes acessíveis ou serviços.
- [x] **Step 5:** Executar teste isolado, suíte Vitest e build; esperado: PASS.
- [x] **Step 6:** Commit: `feat(front): unify authentication experience`.

### Task 4: Dashboard, indicadores, avaliações e insights

**Files:**
- Create: `dashboard-front/src/components/dashboard/DashboardStates.test.tsx`
- Modify: `dashboard-front/src/pages/Dashboard.tsx`
- Modify: `dashboard-front/src/components/dashboard/DashboardHeader.tsx`
- Modify: `dashboard-front/src/components/dashboard/StatsGrid.tsx`
- Modify: `dashboard-front/src/components/dashboard/StatsGrid.test.tsx`
- Modify: `dashboard-front/src/components/dashboard/ReviewFeed.tsx`
- Modify: `dashboard-front/src/components/dashboard/ReviewCard.tsx`
- Modify: `dashboard-front/src/components/dashboard/ReviewCard.test.tsx`
- Modify: `dashboard-front/src/components/dashboard/InsightsSidebar.tsx`

**Interfaces:**
- Consumes: primitivas editoriais, tokens e variantes de movimento.
- Preserva: `StatsGrid({ stats, establishments })`, `ReviewFeed({ feed, stats, onAddStore })`, `ReviewCard({ review })` e `InsightsSidebar({ stats })`.

- [x] **Step 1:** Criar teste de estados verificando que amostra vazia explica a ação seguinte, skeleton mantém três métricas e falha/aviso parcial permanecem com papéis acessíveis.
- [x] **Step 2:** Executar testes de dashboard; esperado: o novo texto/estado editorial ainda não existe.
- [x] **Step 3:** Redesenhar cabeçalho e seletor como barra de contexto, mantendo `label="Estabelecimento"`, seleção consolidada e aviso de coleta parcial.
- [x] **Step 4:** Migrar StatsGrid para `MetricPanel`, mantendo os textos “Nota no Google”, “Comentários analisados” e distinção da satisfação textual.
- [x] **Step 5:** Reorganizar ReviewFeed/ReviewCard em leitura editorial, manter deduplicação de aspectos e “Ler avaliação completa” somente quando truncado.
- [x] **Step 6:** Reestilizar gráficos e insights com rótulos textuais, limite mínimo de menções e paleta acessível.
- [x] **Step 7:** Adicionar entrada escalonada e transição curta ao trocar escopo, sem atrasar conteúdo para movimento reduzido.
- [x] **Step 8:** Executar todos os testes de dashboard e `npm run build`; esperado: PASS.
- [x] **Step 9:** Commit: `feat(front): transform dashboard into editorial experience`.

### Task 5: Lojas, modais e estados operacionais

**Files:**
- Modify: `dashboard-front/src/pages/MinhasLojas.tsx`
- Modify: `dashboard-front/src/components/modals/CreateEstablishmentModal.tsx`
- Modify: `dashboard-front/src/components/modals/CreateEstablishmentModal.test.tsx`
- Modify: `dashboard-front/src/components/modals/MiningProgressModal.tsx`
- Modify: `dashboard-front/src/components/modals/MiningProgressModal.test.tsx`

**Interfaces:**
- Preserva: criação, exclusão, atualização manual, coleta semanal, polling, coleta parcial, timeout e callbacks públicos dos modais.

- [x] **Step 1:** Acrescentar testes que fixem `role="dialog"`, títulos associados, mensagem dinâmica em `aria-live` e botão de continuar em segundo plano com nome acessível.
- [x] **Step 2:** Executar testes dos modais; esperado: falha somente nas novas garantias semânticas ainda ausentes.
- [x] **Step 3:** Reorganizar cartões de loja na ordem identidade → status → indicadores → coleta → ações, mantendo todos os dados e handlers.
- [x] **Step 4:** Aplicar superfície editorial, backdrop e transição de deslocamento aos dois modais, preservando foco, Escape e polling real.
- [x] **Step 5:** Executar testes dos modais, suíte Vitest e build; esperado: PASS.
- [x] **Step 6:** Commit: `feat(front): polish stores and mining workflows`.

### Task 6: Responsividade, acessibilidade e validação final

**Files:**
- Modify: `dashboard-front/e2e/dashboard.spec.ts`
- Modify: `dashboard-front/e2e-fullstack/integration.spec.ts` somente se texto acessível intencional mudar.
- Modify: `dashboard-front/src/index.css` para correções descobertas na inspeção.

**Interfaces:**
- Consumes: toda a experiência visual das Tasks 1–5.
- Produces: frontend pronto para Docker sem regressão funcional.

- [x] **Step 1:** Ampliar o Playwright para validar ausência de overflow em 320 px, drawer móvel, foco por teclado, estados vazios, `reducedMotion: "reduce"` e seletor de estabelecimento.
- [x] **Step 2:** Executar `npm run test:e2e`; esperado: registrar qualquer regressão visual/semântica restante.
- [x] **Step 3:** Corrigir somente os problemas encontrados, mantendo contratos e textos usados pelos fluxos full-stack.
- [x] **Step 4:** Executar `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e`; esperado: todos PASS.
- [x] **Step 5:** Com Docker disponível, executar `docker compose up -d --build` e o smoke test do login até dashboard/lojas; se o daemon continuar indisponível, registrar isso sem afirmar validação Docker.
- [x] **Step 6:** Inspecionar manualmente desktop, tablet e 320–390 px, incluindo contraste, foco e movimento reduzido.
- [x] **Step 7:** Commit: `test(front): validate responsive editorial redesign`.

### Task 7: Documentação e entrega

**Files:**
- Modify: `README.md` somente se captura, descrição visual ou instrução de frontend estiver desatualizada.
- Modify: este plano, marcando as tarefas concluídas.

**Interfaces:**
- Produces: histórico rastreável do redesign e instruções coerentes com a entrega.

- [x] **Step 1:** Registrar no plano os comandos executados e qualquer limitação de ambiente remanescente.
- [x] **Step 2:** Revisar `git diff --check`, `git status --short` e o diff para garantir que `.env`, artefatos locais e arquivos científicos não relacionados não foram incluídos.
- [x] **Step 3:** Commit final apenas se houver documentação adicional: `docs(front): document editorial redesign`.

## Registro de validação

- `npm run lint`: aprovado sem erros.
- `npm test`: 9 arquivos e 18 testes aprovados.
- `npm run build`: aprovado, com divisão dos pacotes React e Framer Motion e sem alerta de pacote principal excessivo.
- `npm run test:e2e`: 3 fluxos aprovados, cobrindo navegação móvel, mineração simulada, seleção de loja, paginação, 320 px e movimento reduzido.
- Docker: imagens reconstruídas; PostgreSQL, API e frontend reportaram estado saudável.
- Smoke test Docker: cadastro, acesso ao dashboard, logout e novo login aprovados contra Nginx, API e banco reais.
- O caminho relativo de `ABSA_MODEL_HOST_PATH` foi substituído somente no processo de validação pelo caminho absoluto do mesmo checkpoint local. O arquivo `.env` não foi alterado nem versionado.
