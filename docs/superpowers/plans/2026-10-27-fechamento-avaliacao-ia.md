# Fechamento da Avaliação da IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir e documentar uma avaliação de cinco épocas, explicitar o método de avaliação e analisar tecnicamente o desempenho do BERTweet.

**Architecture:** O treinamento será executado isoladamente com o script existente e gravado em um novo diretório de artefatos. O relatório JSON será a fonte única dos valores inseridos na monografia; o checkpoint de produção não será modificado.

**Tech Stack:** Python, PyTorch, Transformers, CUDA, M-ABSA, LaTeX, TikZ e BibLaTeX.

**Spec:** `docs/superpowers/specs/2026-10-27-fechamento-avaliacao-ia-design.md`

## Global Constraints

- Cinco épocas completas desde o modelo-base, semente 42 e mesmo conjunto.
- Seleção apenas por Macro-F1 de validação; teste consultado uma vez ao final.
- Saída experimental separada do modelo em produção.
- Todo número da monografia deve ser rastreável ao relatório JSON.
- Não interpretar a comparação como superioridade universal de arquitetura.

## Review Focus

- Vazamento do teste para seleção do checkpoint.
- Alteração acidental dos hiperparâmetros da execução original.
- Sobrescrita do artefato usado pelo sistema.
- Divergência entre relatório JSON, tabelas, resumo e conclusão.
- Explicação causal do BERTweet além da evidência disponível.

---

### Task 1: Congelar e verificar o protocolo

**Files:**
- Read: `minerador-py/artifacts/bertimbau-absa/training_args.json`
- Read: `minerador-py/artifacts/bertimbau-absa/training_report.json`
- Read: `minerador-py/treinar_bertimbau_absa.py`

- [ ] Registrar os tamanhos, hiperparâmetros e métricas da execução original.
- [ ] Confirmar CUDA e espaço disponível.
- [ ] Confirmar que a saída de cinco épocas possui caminho exclusivo.

### Task 2: Executar cinco épocas

**Files:**
- Create: `minerador-py/artifacts/experiments/bertimbau-absa-5ep/`

- [ ] Executar o treinamento com os valores congelados.
- [ ] Preservar o log integral da execução.
- [ ] Confirmar que cinco registros aparecem em `history`.
- [ ] Confirmar que o teste foi executado após o laço de validação.

### Task 3: Validar e sintetizar o experimento

**Files:**
- Read: `minerador-py/artifacts/experiments/bertimbau-absa-5ep/training_report.json`

- [ ] Identificar a melhor época pela Macro-F1 de validação.
- [ ] Conferir métricas e matriz de confusão do teste.
- [ ] Comparar a curva com a execução original sem escolher pelo teste.
- [ ] Gerar uma síntese rastreável para a redação.

### Task 4: Atualizar a avaliação no Capítulo 4

**Files:**
- Modify: `../monografiaArthurSavio_entrega/textuais/mats_e_mets.tex`
- Modify: `../monografiaArthurSavio_entrega/textuais/result_e_disc.tex`
- Modify: `../monografiaArthurSavio_entrega/pretextuais/resumo.tex`
- Modify: `../monografiaArthurSavio_entrega/textuais/conclusao.tex`
- Modify: `../monografiaArthurSavio_entrega/postextuais/bibliografia3.bib`

- [ ] Explicar o método de avaliação e definir suporte.
- [ ] Inserir ou reposicionar o código fundamental no Capítulo 4.
- [ ] Apresentar a tabela das cinco épocas e discutir a curva.
- [ ] Analisar o BERTweet com base na tarefa, entrada, domínio e erros observados.
- [ ] Harmonizar resumo e conclusão com o checkpoint efetivamente selecionado.

### Task 5: Compilar e verificar

**Files:**
- Verify: `../monografiaArthurSavio_entrega/`
- Output: `../output/pdf/monografiaArthurSavio_revisada.pdf`

- [ ] Compilar a bibliografia e o documento completo.
- [ ] Verificar erros, referências, métricas e numeração.
- [ ] Renderizar as páginas alteradas e inspecionar visualmente.
- [ ] Confirmar que os quatro pedidos da orientadora estão explícitos.
