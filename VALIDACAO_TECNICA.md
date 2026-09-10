# Validação técnica de fechamento

Validação executada em 9 de setembro de 2026, em um ambiente Docker isolado,
com PostgreSQL 15, Java 21, Python 3.11, Chromium, frontend Nginx e o checkpoint
BERTimbau ABSA local.

## Resultado automatizado

| Camada | Verificação | Resultado |
|---|---|---:|
| API | `bash ./mvnw package` | 104 testes aprovados |
| Minerador | `python -m unittest discover -s minerador-py -p 'test_*.py'` | 25 testes aprovados |
| Frontend | ESLint | aprovado |
| Frontend | Vitest | 3 testes aprovados |
| Frontend | build de produção | aprovado |
| Navegador | Playwright/Chromium | 1 fluxo E2E aprovado |
| Dependências frontend | `npm audit` | 0 vulnerabilidades conhecidas |

O GitHub Actions repete lint, testes, build e E2E a cada push na `main` e em
pull requests.

## Resultado integrado em Docker

- As três imagens foram construídas e os serviços `db`, `api` e `frontend`
  iniciaram; PostgreSQL, API e Nginx atingiram estado saudável.
- O preflight confirmou o checkpoint BERTimbau ABSA pelo SHA-256
  `100216eb068d8a2c0d7f2238ed44ff3d27a40c564995038ca036e9284f3b98b6` e
  executou a inferência curta obrigatória.
- O Flyway aplicou as migrations V1, V2 e V3 em um PostgreSQL vazio. O schema
  terminou em V3 e o Hibernate o validou sem gerar tabelas automaticamente.
- Uma requisição sem token recebeu HTTP 401 em JSON. O proprietário recebeu
  HTTP 200 ao consultar seu job; uma segunda conta recebeu HTTP 404 para o
  mesmo identificador, sem acesso ao estado do primeiro usuário.
- Um job deixado em `RUNNING` foi recuperado depois do reinício da API. A tarefa
  voltou à fila, executou o minerador e terminou corretamente, sem permanecer
  travada como ativa.
- Uma mineração real do Google Maps concluiu com 5 avaliações e 12 aspectos na
  primeira visualização limitada. A coleta seguinte alcançou as 100 avaliações
  mais recentes, reconheceu registros anteriores e adicionou 96, totalizando
  101 avaliações distintas e 45 aspectos.
- Uma terceira coleta do mesmo recorte terminou com `reviewsImported: 0`; o
  banco permaneceu com 101 avaliações e 101 `google_review_id` distintos. Isso
  comprova a deduplicação no fluxo completo.

## Cobertura dos riscos de fechamento

| Risco | Evidência |
|---|---|
| Consulta de job por outro usuário | teste de repositório/controlador e prova Docker com duas contas |
| Rejeição por fila cheia | teste unitário garante `FAILED` e permite nova tentativa |
| Perda de status no reinício | migration V3, teste de recuperação e reinício real do contêiner |
| Progresso fictício no frontend | modal usa apenas `QUEUED/RUNNING/COMPLETED/FAILED` devolvido pela API |
| Falha de rede infinita | teste do limite de cinco falhas consecutivas |
| Vazamento de detalhes internos | testes do handler global e respostas 401/403 padronizadas |
| Regressão do fluxo principal | CI com testes Java/Python/React e E2E no Chromium |

## Observações operacionais

O primeiro build da API é pesado porque instala Java, PyTorch e Chromium; os
builds seguintes reutilizam cache. O primeiro uso do BERTweet também exige
download, preservado pelo volume `huggingface_cache`. O checkpoint BERTimbau
continua fora do Git e é montado como volume somente leitura com checksum
obrigatório.

A coleta do Google Maps depende da interface pública e pode receber uma
visualização limitada; por isso o sistema registra mensagens explícitas,
permite nova tentativa e mantém o último conjunto bem-sucedido no banco.
