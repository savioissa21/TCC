# Especificação da revisão da monografia

## Objetivo

Atualizar a monografia para representar com fidelidade a versão definitiva da plataforma e revisar integralmente sua redação acadêmica, sem alterar resultados científicos já obtidos nem criar evidências inexistentes.

## Decisões aprovadas

- Apify é o provedor principal de aquisição das avaliações do Google Maps.
- O Actor `compass/google-maps-reviews-scraper` recebe a URL cadastrada, ordena avaliações pelas mais recentes e devolve dados estruturados.
- A meta operacional é obter até 100 comentários textuais por execução. Para compensar avaliações sem texto, o coletor solicita um lote bruto maior, limitado a 500 itens.
- Avaliações formadas apenas por estrelas não entram na amostra textual, na ABSA nem no índice de satisfação; elas são contabilizadas apenas nos metadados agregados provenientes do Google.
- A nota oficial e a quantidade total de avaliações do Google são exibidas separadamente da quantidade de comentários analisados e da satisfação textual calculada pela plataforma.
- Atualizações manuais e semanais enviam ao coletor os identificadores já conhecidos; o coletor continua examinando o lote e o backend mantém uma segunda barreira de deduplicação.
- `APIFY_MAX_TOTAL_CHARGE_USD` limita o custo máximo de cada execução.
- Playwright deixa de ser descrito como coletor principal e permanece como tecnologia de testes de ponta a ponta; SerpApi e o coletor por navegador são alternativas técnicas, não o fluxo experimental definitivo.
- A revisão deve preservar a delimitação científica: regras determinísticas detectam aspectos e o BERTimbau classifica a polaridade das menções.

## Escopo editorial

Revisar resumo, abstract, introdução, fundamentos, materiais e métodos, resultados e discussão, conclusão e referências. Corrigir clareza, coesão, repetição, concordância, padronização terminológica e coerência entre capítulos.

## Critérios de aceitação

- Nenhum trecho afirma que Playwright/Chromium é o mecanismo principal de coleta.
- Método, resultados, conclusão, resumo e abstract descrevem o mesmo fluxo.
- Indicadores oficiais do Google e métricas da amostra textual aparecem conceitualmente separados.
- Limitações mencionam dependência e custo do serviço externo sem afirmar garantias de quantidade.
- Números de testes correspondem à versão verificada do repositório.
- O documento LaTeX compila sem erro e o PDF final não apresenta regressões visuais evidentes.
