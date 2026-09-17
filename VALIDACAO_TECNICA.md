# Validação técnica de fechamento

## Baseline da correção — 17/09/2026

Branch `fix/integracao-tcc-nexo`, origem `18eb485`, árvore inicialmente limpa.
Nenhum AGENTS.md encontrado nos diretórios aplicáveis. README principal,
READMEs internos, relatório de treino e configurações foram lidos. PDF da
proposta e fonte editável ausentes; matriz inicial em MATRIZ_VALIDACAO.md.

| Comando / ambiente | Resultado nesta sessão |
|---|---|
| `mvnw.cmd test` (Java 22.0.1 inicial) | 110 testes, 0 falhas, 0 erros, 0 skips; 47,986 s |
| Python 3.12.6, `python -m unittest discover -s minerador-py -p 'test_*.py'` | 37 testes; 12 erros DOM por subprocessos bloqueados; fora do sandbox: Chromium ausente |
| Node 22.12.0, `npm ci` | cache restrito falhou; repetição com rede: 392 pacotes, audit 0 vulnerabilidades |
| `npm run lint` | aprovado |
| `npm test` | 2 arquivos, 5 testes aprovados |
| `npm run build` | aprovado, aviso de chunk >500 kB |
| `npm run test:e2e` | 2 falhas: executável Chromium ausente |
| Docker 29.2.0 / Compose 5.0.2 | daemon inicialmente parado; iniciado durante preparação |

Java 21.0.2 também está instalado e será selecionado explicitamente. O jsdom
29.1.1 exige Node >=22.13 na série 22; houve aviso de engine com 22.12.
Python 3.11 será usado nos contêineres. `.env` criado localmente com segredos
aleatórios e ignorado pelo Git. Checkpoint oficial ainda não localizado.
Logs locais `baseline-*.log` são ignorados pelo Git. Os números abaixo são
históricos e não substituem esta validação.

### Fase 1 — contratos

Base relativa `/api` e proxy Vite com a mesma remoção de prefixo do Nginx.
O endpoint histórico `/api/reviews` é preservado no backend: externamente passa
por `/api/api/reviews`, coberto por teste de contrato. Menu móvel agora navega
e encerra sessão; o controle de recuperação fictícia foi removido. Nome é
aparado e validado, protocolo HTTP/HTTPS obrigatório, identificadores vazios
rejeitados e URL limitada a 2.000. V4 amplia URL e limita nome sem truncamento
silencioso de registros antigos. Status persistido pode ser reaberto, atualizado
e acompanhado em segundo plano, com falha e coleta parcial distintas.

Validação: 112 testes Java em Java 21.0.2; 6 React, lint e build aprovados;
3 E2E de interface com API simulada aprovados (incluindo menu em 360 px).
O teste do contexto precisou atualizar a versão esperada de V3 para V4.
Após instalar Chromium, baseline de navegador: 2/2 aprovados.

### Fase 2 — segurança e persistência

Normalização de e-mail antes da validação; V5 normaliza registros e exige a
representação canônica. Colisões entre contas interrompem a migration, sem
mesclar usuários. Bearer exige prefixo válido, usuário removido recebe 401,
issuer é validado, e segredo curto ou repetitivo impede startup. O tamanho e a
diversidade são verificáveis; entropia real exige geração aleatória. BCrypt e
expiração de 24 horas mantidos, sem refresh token. Erros incluem status e
timestamp; conflitos de banco não imprimem dados recebidos.

V6 usa TEXT para comentários e trechos completos. V7 impõe nulidade e tamanho
nos campos essenciais. Sentimentos históricos nulos continuam aceitos como
não classificados; valores presentes têm domínio restrito. Antes de atualizar
um banco legado, corrigir registros inválidos em cópia: não há preenchimento
fictício nem truncamento. Importação e atualização de sucesso executam em uma
transação, após o subprocesso, incluindo promoção das identidades antigas.
Saúde consulta `SELECT 1` e retorna 503 se o banco falhar.

Validação H2/Java 21: 116 testes, 0 falhas/erros/skips. Inclui JWT inválido,
expirado, usuário removido, prefixos malformados, chave fraca, CORS e e-mail.
PostgreSQL real e E2E integrado são a próxima camada, ainda não comprovados
por esse resultado. Baseline Python após instalar navegador: 37/37, sem skips.

### Fases 3 e 4 — IA e DOM determinístico

43 testes Python aprovados, sem skips, incluindo lotes, texto longo, candidatos
dos quatro aspectos, ausência de comentário, falha atômica e vazamento de
splits. Fixtures HTML versionadas cobrem expansão, resposta da empresa,
avaliação sem texto e lista virtualizada; não dependem da rede. Os scripts de
produção, treino e benchmark passaram em `py_compile`. Inferência real,
benchmark e reprodução das métricas não foram executados: falta checkpoint.
O protocolo de dois anotadores está documentado, mas não há amostra anotada.

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

## Correções de coleta e dashboard — 11/09/2026

- O dashboard permite selecionar uma loja ou a visão consolidada, explicitamente
  identificada. Feed, totais e gráficos usam o mesmo escopo. A criação de uma loja
  seleciona essa loja; a troca reinicia a paginação e cancela consultas antigas.
  Cada cartão informa o estabelecimento de origem. A API valida a propriedade
  também no filtro dos indicadores.
- Etiquetas são agrupadas por aspecto e polaridade na apresentação. Os trechos
  continuam preservados e podem ser consultados no título da etiqueta. Opiniões
  positivas e negativas sobre o mesmo aspecto permanecem distintas. A agregação
  científica no banco continua contando os trechos analisados, não as etiquetas.
- O cartão permite expandir o texto no dashboard. O coletor distingue o botão do
  comentário de menus, detalhes de avaliações sem texto e respostas da empresa,
  e espera a confirmação de expansão antes de extrair o comentário.
- `maps_collector.py` concentra a navegação e coleta, sem carregar os modelos.
  Exige acesso à ordenação por mais recentes, tenta reabrir a página quando a
  sessão recebe uma prévia limitada, coleta lotes virtualizados e resolve o painel
  rolável atual. Falhas persistentes de expansão não geram importação parcial.
  Quando a contagem pública está disponível, compara o coletado com a menor
  quantidade entre essa contagem e a meta configurada.

Validação automatizada: 105 testes Java, 34 testes Python, 4 testes React e 2
testes de navegador com API simulada, além de lint e build do frontend. Os novos
testes incluem duas lojas da mesma conta, acesso por outra conta, paginação,
etiquetas repetidas, expansão assíncrona, lote inicial de cinco itens e lista
virtualizada de quinze avaliações. Python/Chromium também foi incluído no CI.

O teste público do coletor pode ser repetido sem IA e sem gravar no banco:

```powershell
python minerador-py/smoke_maps_collector.py "URL_DO_GOOGLE_MAPS" --target 100
```

Em uma execução intermediária no link público testado, a coleta chegou a 20 IDs
únicos. Outras execuções, inclusive em contêiner, receberam um convite de login
ao tentar ordenar: as tentativas limitadas terminaram com erro explícito. Isso
documenta uma limitação externa ainda presente; os testes locais não demonstram
que a coleta anônima de 100 avaliações estará sempre disponível. Os testes de
DOM de expansão passaram, mas a versão final não teve uma nova coleta pública
completa confirmada enquanto essa restrição persistiu.

As imagens Docker foram reconstruídas e os contêineres locais da API e do
frontend foram atualizados. API, frontend e PostgreSQL ficaram saudáveis; a
página inicial respondeu HTTP 200 e o endpoint `/health` respondeu normalmente.
O banco existente e o arquivo `.env` foram preservados.

As alterações de apresentação valem também para os registros existentes. Textos
antigos já gravados truncados não são reescritos automaticamente: a importação
continua deduplicando por identidade, e sua correção exige reprocessamento.

## Correção da regressão de coleta vazia — 13/09/2026

A tentativa do Vikings Pub falhava antes da extração: a ordenação por mais
recentes era obrigatória mesmo quando o Maps disponibilizava avaliações públicas.
O fluxo de produção agora tenta abrir e ordenar a lista e, se não conseguir,
importa os comentários completos acessíveis com indicação de **coleta parcial**.
O modo estrito continua disponível nas funções de coleta para validações.

O resultado do Python inclui `reviews` e `collectionWarnings`. O backend aceita
também o formato antigo em lista, preserva a indicação parcial na loja e no job
e agenda a próxima tentativa pelo intervalo de repetição (24 horas por padrão).
Uma coleta parcial com zero avaliações novas não apaga esse aviso. A interface
o mostra no modal, no dashboard e em Minhas Lojas. Comentários cuja expansão
falhe são excluídos do lote parcial; uma coleta sem nenhuma avaliação legível
continua sendo considerada falha. Limitação de acesso não é evidência de ausência
de avaliações novas.

O smoke test público do link usado pelo usuário recuperou 10 avaliações com
10 IDs distintos e texto de até 1.282 caracteres, com os avisos
`SORT_UNCONFIRMED` e `TARGET_NOT_REACHED`. Essa evidência é de coleta parcial,
não de acesso garantido a todas as avaliações ou às 100 mais recentes.

Validação desta correção: 110 testes Java, 37 testes Python, 5 testes React,
lint e 2 E2E no Chromium passaram. A primeira execução concorrente teve timeout
de inicialização dos workers React e uma falha de temporização no cenário de
rolagem simulada. Os testes React passaram com um worker; a simulação de rolagem
foi ajustada para reposicionar o painel após o próximo frame, sem ancoragem de
rolagem, e a suíte Python passou. As imagens
Docker foram reconstruídas, a API e o frontend atualizados, e os endpoints da
página inicial e de saúde responderam HTTP 200 e `UP`, respectivamente.

O teste integrado também expôs um limite de tokens do BERTweet: um comentário
longo ainda ultrapassava o limite apesar do corte antigo em 512 caracteres.
A inferência geral agora usa `truncation=True` no tokenizer, preservando o texto
completo no armazenamento e na extração de aspectos. Erros inesperados de
inferência interrompem a execução, em vez de descartar avaliações silenciosamente.
Também se confirma a presença dos cartões após ordenar: um clique aceito com
lista vazia leva a uma nova tentativa ou à reabertura da prévia pública.

Após a correção do limite de tokens, o minerador integrado executado dentro do
Docker terminou com 10 avaliações analisadas, 10 IDs Google distintos e 32
trechos de aspectos, mantendo o texto de 1.282 caracteres e os dois avisos de
coleta parcial. Esse teste gerou um arquivo temporário para validar coleta e
inferência; não inseriu registros na conta do usuário. A leitura/importação do
novo formato foi coberta pelos testes Java. A imagem final da API foi
reconstruída e aplicada com a mesma correção testada.
