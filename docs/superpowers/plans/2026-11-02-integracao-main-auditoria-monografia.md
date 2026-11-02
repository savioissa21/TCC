# Integração final e auditoria da monografia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar todo o trabalho aprovado na `main`, alinhar a monografia ao sistema final e publicar apenas artefatos verificados.

**Architecture:** A integração preserva primeiro os documentos locais, depois incorpora a branch de frontend e valida o monorepo. A auditoria cruza afirmações e contagens da fonte LaTeX com código, configuração e testes; qualquer correção é recompilada e conferida no PDF antes do push.

**Tech Stack:** Git, React/Vitest/Playwright, Spring Boot/Maven, Python/Pytest, LaTeX e Poppler.

**Spec:** `docs/superpowers/specs/2026-11-02-integracao-main-auditoria-monografia.md`

## Global Constraints

- Não apagar nem sobrescrever os sete documentos locais já existentes.
- Não versionar segredos, checkpoints, caches ou artefatos temporários.
- Não alterar resultados científicos sem evidência reproduzível.
- Não enviar a `main` antes da validação local do resultado mesclado.

## Review Focus

- divergência entre fonte Overleaf, ZIP e PDF final;
- contagens de testes desatualizadas após o redesign;
- descrição de provedor, modelo ou pipeline diferente da configuração atual;
- arquivos locais legítimos deixados fora do commit;
- branch remota avançada durante o trabalho.

---

### Task 1: Preservar documentos e integrar o redesign

**Files:**
- Add: `docs/experiments/bertimbau-5ep-2026-10-27.md`
- Add: documentos locais em `docs/superpowers/{plans,specs}/`
- Merge: `feat/redesign-executivo-editorial` em `main`

**Interfaces:**
- Consumes: `main`, `origin/main` e `feat/redesign-executivo-editorial`.
- Produces: árvore `main` local com toda a documentação e o frontend aprovado.

- [ ] **Step 1: Validar e versionar os documentos locais sem segredos**
- [ ] **Step 2: Atualizar referências remotas e confirmar a base**
- [ ] **Step 3: Mesclar a branch de redesign na `main`**
- [ ] **Step 4: Executar testes do resultado mesclado**

### Task 2: Auditar fonte e PDF contra o sistema

**Files:**
- Inspect/Modify: `../output/overleaf/monografiaArthurSavio_overleaf/`
- Inspect/Modify: `../output/pdf/monografiaArthurSavio_revisada.pdf`

**Interfaces:**
- Consumes: código e testes da `main` mesclada.
- Produces: lista de correspondências e divergências comprovadas.

- [ ] **Step 1: Confirmar qual fonte gerou a revisão mais recente**
- [ ] **Step 2: Extrair texto completo do PDF e mapear afirmações verificáveis**
- [ ] **Step 3: Conferir arquitetura, coleta, modelos, aspectos, métricas, testes e interface**
- [ ] **Step 4: Corrigir somente divergências comprovadas**

### Task 3: Recompilar, verificar e publicar

**Files:**
- Modify: pacote Overleaf e PDF somente se a auditoria exigir correções.

**Interfaces:**
- Consumes: fonte auditada.
- Produces: PDF e ZIP sincronizados, além de `origin/main` atualizado.

- [ ] **Step 1: Compilar a fonte LaTeX e revisar diagnósticos**
- [ ] **Step 2: Renderizar e inspecionar visualmente todas as páginas relevantes**
- [ ] **Step 3: Atualizar ZIP/PDF finais e conferir hashes/conteúdo**
- [ ] **Step 4: Revisar diff, executar verificações finais e enviar `main`**
