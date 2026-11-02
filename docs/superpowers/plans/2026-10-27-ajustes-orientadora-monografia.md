# Ajustes da orientadora na monografia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar os diagramas, referências e esclarecimentos solicitados pela orientadora e revisar o uso de estrangeirismos.

**Architecture:** Os diagramas serão componentes TikZ separados e incluídos no capítulo de Materiais e Métodos. O texto acadêmico será atualizado com referências primárias do Google e da Apify, mantendo a distinção entre extração de aspectos por regras e classificação pelo BERTimbau.

**Tech Stack:** LaTeX, TikZ, BibLaTeX/Biber e estilo ABNT.

**Spec:** `docs/superpowers/specs/2026-10-27-ajustes-orientadora-monografia-design.md`

## Global Constraints

- Diagramas vetoriais, monocromáticos e legíveis em A4.
- Fontes primárias para os procedimentos técnicos.
- Estrangeirismos comuns em itálico; marcas, siglas e código sem itálico.
- Nenhuma mudança nas métricas científicas já apuradas.

## Review Focus

- O diagrama de pacotes deve corresponder às pastas reais do projeto.
- O fluxograma deve separar extração determinística e inferência do BERTimbau.
- A API oficial do Google só pode acessar perfis autorizados e verificados.
- Apify deve permanecer identificada como serviço externo, não oficial.
- A compilação não pode introduzir estouros, cortes ou referências inexistentes.

---

### Task 1: Referências e alternativa oficial do Google

**Files:**
- Modify: `postextuais/bibliografia3.bib`
- Modify: `textuais/mats_e_mets.tex`

- [ ] Adicionar referências oficiais para requisitos, listagem de avaliações e limites da Google Business Profile API, além da página do Actor utilizado.
- [ ] Explicar a alternativa oficial, suas capacidades, autorização e aprovação prévia.
- [ ] Citar as fontes no procedimento de aquisição e extração.
- [ ] Verificar todas as chaves com busca textual.

### Task 2: Diagramas acadêmicos

**Files:**
- Modify: `formatacao.sty`
- Create: `figuras/diagrama_pacotes.tex`
- Create: `figuras/fluxo_aspectos.tex`
- Modify: `textuais/mats_e_mets.tex`

- [ ] Habilitar TikZ e as bibliotecas estritamente necessárias.
- [ ] Criar e inserir o diagrama de pacotes na Seção 3.2.
- [ ] Criar e inserir o fluxograma dos aspectos após a descrição da pipeline.
- [ ] Acrescentar chamadas textuais às figuras.

### Task 3: Polaridade e estrangeirismos

**Files:**
- Modify: `textuais/fundamentos.tex`
- Modify: `textuais/mats_e_mets.tex`
- Modify: demais arquivos `.tex` que contenham estrangeirismos comuns sem marcação.

- [ ] Definir polaridade em linguagem acadêmica e distingui-la da nota em estrelas.
- [ ] Revisar termos estrangeiros comuns em toda a monografia.
- [ ] Preservar marcas, siglas e identificadores técnicos sem itálico.

### Task 4: Validação final

**Files:**
- Verify: projeto LaTeX completo.

- [ ] Executar varredura de chaves, termos e referências cruzadas.
- [ ] Compilar com XeLaTeX e confirmar ausência de erros de fonte.
- [ ] Renderizar e inspecionar visualmente as páginas dos dois diagramas.
- [ ] Registrar separadamente qualquer falha exclusiva do Biber local.
