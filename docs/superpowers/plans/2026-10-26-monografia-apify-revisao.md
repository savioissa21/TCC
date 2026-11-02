# Atualização da Monografia para o Fluxo Apify — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar e revisar integralmente a monografia para representar a versão definitiva e verificada da plataforma.

**Architecture:** A revisão parte do código e dos testes existentes como fonte primária. Primeiro harmoniza o fluxo técnico em todos os capítulos; depois executa uma revisão editorial global; por fim compila e inspeciona o PDF.

**Tech Stack:** LaTeX, BibLaTeX/Biber, compilador integrado do Codex e código de referência em Python, Java/Spring Boot e React/TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-26-monografia-revisao.md`

## Global Constraints

- Não inventar resultados, experimentos, números, datas ou referências.
- Preservar os resultados científicos já consolidados para BERTimbau e BERTweet.
- Distinguir dados oficiais do Google de métricas calculadas sobre comentários textuais coletados.
- Manter o estilo LaTeX e a estrutura acadêmica existentes.
- Não expor tokens, chaves ou valores privados do arquivo `.env`.

## Review Focus

- Afirmações antigas sobre Playwright como coletor principal devem ser eliminadas de todos os capítulos.
- Quantidade solicitada não deve ser apresentada como garantia de comentários efetivamente obtidos.
- Avaliações sem texto não podem ser descritas como parte da análise de sentimentos.
- Contagens de testes precisam ser confirmadas por execução, e não copiadas de documentos desatualizados.
- Referências técnicas devem corresponder às ferramentas efetivamente descritas.

---

### Task 1: Verificar o estado real da plataforma

**Files:**
- Read: `minerador-py/apify_collector.py`
- Read: `minerador-py/minerador_integrado.py`
- Read: `dashboard-api/src/main/java/com/tcc/dashboard/service/MiningService.java`
- Read: `dashboard-front/src/components/dashboard/StatsGrid.tsx`

**Interfaces:**
- Consumes: implementação atual da coleta, importação e indicadores.
- Produces: conjunto factual usado em toda a revisão.

- [ ] **Step 1:** Registrar provedor, Actor, ordenação, limites, filtragem textual, metadados e deduplicação verificados no código.
- [ ] **Step 2:** Executar as suítes do backend, minerador, ferramentas científicas e frontend para confirmar as contagens atuais.

### Task 2: Harmonizar a descrição técnica

**Files:**
- Modify: `monografiaArthurSavio_entrega/textuais/intro.tex`
- Modify: `monografiaArthurSavio_entrega/textuais/fundamentos.tex`
- Modify: `monografiaArthurSavio_entrega/textuais/mats_e_mets.tex`
- Modify: `monografiaArthurSavio_entrega/textuais/result_e_disc.tex`
- Modify: `monografiaArthurSavio_entrega/textuais/conclusao.tex`
- Modify: `monografiaArthurSavio_entrega/pretextuais/resumo.tex`
- Modify: `monografiaArthurSavio_entrega/pretextuais/abstract.tex`
- Modify: `monografiaArthurSavio_entrega/postextuais/bibliografia3.bib`

**Interfaces:**
- Consumes: fatos verificados na Task 1.
- Produces: narrativa consistente do fluxo definitivo.

- [ ] **Step 1:** Substituir a coleta direta por navegador pela execução do Actor na Apify.
- [ ] **Step 2:** Documentar filtragem de comentários, sobrecoleta bruta, custo máximo e tratamento de falhas.
- [ ] **Step 3:** Explicar a separação entre nota oficial do Google e indicadores textuais.
- [ ] **Step 4:** Atualizar deduplicação, atualização incremental, limitações e trabalhos futuros.
- [ ] **Step 5:** Corrigir bibliografia e citações técnicas.

### Task 3: Fazer a revisão editorial global

**Files:**
- Modify: todos os arquivos textuais listados na Task 2.

**Interfaces:**
- Consumes: narrativa técnica harmonizada.
- Produces: texto acadêmico claro, coeso e terminologicamente padronizado.

- [ ] **Step 1:** Remover redundâncias e períodos excessivamente longos.
- [ ] **Step 2:** Corrigir concordância, pontuação e transições entre seções.
- [ ] **Step 3:** Padronizar termos como coleta, trabalho de coleta, comentário textual, aspecto, polaridade e painel.
- [ ] **Step 4:** Conferir que objetivos, métodos, resultados e conclusão respondem uns aos outros.

### Task 4: Validar o documento final

**Files:**
- Verify: `monografiaArthurSavio_entrega/monografia.tex`

**Interfaces:**
- Consumes: fontes LaTeX revisadas.
- Produces: PDF compilado e visualmente conferido.

- [ ] **Step 1:** Procurar referências residuais incompatíveis com o fluxo definitivo.
- [ ] **Step 2:** Compilar o projeto LaTeX e corrigir erros ou referências ausentes, com até três tentativas.
- [ ] **Step 3:** Renderizar e inspecionar as páginas alteradas, conferindo tabelas, quebras, citações e fórmulas.
- [ ] **Step 4:** Apresentar ao usuário os arquivos modificados, as principais mudanças e eventuais limitações restantes.
