# API de avaliações

Os endpoints exigem autenticação e retornam somente dados do usuário autenticado.

## Login e cadastro

`POST /auth/register` exige nome de 2 a 100 caracteres, e-mail válido com até
254 caracteres e senha de 6 a 72 caracteres. Campos vazios ou em branco são
rejeitados. A senha também é limitada a 72 bytes UTF-8, limite do BCrypt,
incluindo senhas com acentos e emojis. A senha não é aparada nem normalizada.

`POST /auth/login` valida e-mail e senha com os mesmos limites máximos,
sem impor o novo mínimo a senhas antigas. Conta inexistente e senha incorreta
retornam HTTP 401 com `error: "E-mail ou senha inválidos"`. O hash também é
verificado para contas inexistentes. Entradas inválidas e JSON malformado
retornam HTTP 400; no login, a mensagem continua genérica. No cadastro,
a resposta inclui mensagens de validação por campo, sem os valores recebidos.
O frontend exibe a falha de login sem recarregar a página.

## Listagem paginada

- `GET /api/reviews?page=0&size=8&sentiment=Positivo&search=ana`
- `GET /api/reviews/establishment/{id}?page=0&size=8`

A página começa em zero; o tamanho padrão é 8 e o máximo é 100.
Sentimento e busca são opcionais. A busca compara autor e texto sem diferenciar
maiúsculas e minúsculas, tratando caracteres como `%` literalmente.
A ordem é fixa: coleta mais recente primeiro, datas nulas por último e ID
decrescente como desempate.

A resposta passou de uma lista para um objeto paginado:

```json
{
  "content": [],
  "number": 0,
  "size": 8,
  "totalElements": 0,
  "totalPages": 0,
  "last": true
}
```

Cada item de `content` mantém os dados da avaliação e seus aspectos.
Backend e frontend precisam ser atualizados juntos para usar esse contrato.

## Estatísticas

`GET /api/reviews/stats` retorna `total`, `positive`, `negative`, `neutral`,
`avgRating`, `score` (percentual positivo arredondado) e `aspects`
(contagens e percentual positivo por aspecto). Os indicadores abrangem todo
o histórico do usuário, independentemente da página ou filtro da listagem.
Notas nulas continuam contando como zero na média, preservando o cálculo anterior.

`GET /establishments` mantém o contrato de resumo, incluindo lojas sem avaliações.

As consultas JPQL geram agregações SQL executadas no PostgreSQL: uma consulta
para os resumos e duas para as estatísticas. A listagem pagina os IDs no banco
antes de carregar os aspectos da página, com até três consultas. Os aspectos
usam carregamento lazy; a resposta usa DTOs montados dentro da transação.
A mineração lê o histórico em lotes de 500 e retém apenas as correspondências
necessárias para deduplicar o lote importado.

## Identidade e deduplicação

O minerador envia `googleReviewId` com o ID original do Google (ou nulo quando
indisponível), além do `id` compatível com o hash anterior. O banco preserva
o ID original, único por estabelecimento. Avaliações com IDs Google distintos
são mantidas mesmo quando autor, nota e texto são iguais.

O fingerprint de autor, nota e texto é usado apenas quando falta o ID original
ou para reconciliar registros antigos sem esse campo. As correspondências
exatas por ID têm prioridade. Cada registro antigo pode ser associado a apenas
um ID Google; ao reencontrá-lo, o importador preenche esse ID sem alterar sua
chave interna, os aspectos ou a data de coleta. Isso impede que o mesmo registro
antigo continue descartando outros IDs com conteúdo igual em coletas futuras.
O esquema é atualizado pelas migrations versionadas do Flyway. O Hibernate usa
`ddl-auto=validate` e apenas confere a compatibilidade das entidades.

## Testes

Execute `./mvnw test` (ou `mvnw.cmd test` no Windows) com Java 21.
O perfil `test` usa H2 em modo PostgreSQL, executa as mesmas migrations da aplicação,
valida as entidades com `ddl-auto=validate` e desativa a mineração agendada.
Os testes verificam contagem de consultas, entidades carregadas, isolamento
por usuário, filtros, paginação, valores nulos, lojas vazias e deduplicação.
Essa suíte não substitui a validação em uma instância PostgreSQL real.

## Evolução do banco com Flyway

O Flyway gerenciado pelo Spring Boot executa as migrations de
`src/main/resources/db/migration` antes de inicializar o JPA.
A dependência `flyway-database-postgresql` habilita PostgreSQL.
O perfil `prod` (já selecionado pelo Docker Compose e pelo Dockerfile) usa
`ddl-auto=validate`; a configuração padrão e a de testes também usam validação.
O Hibernate não cria nem altera tabelas.

- `V1__create_initial_schema.sql`: cria as quatro tabelas, chaves, relacionamentos
  e campos existentes antes da adoção do Flyway.
- `V2__add_google_identity_and_review_indexes.sql`: adiciona o ID original Google
  e os índices. As adições toleram colunas/índices já criados pelo antigo `update`.

Em banco vazio, basta iniciar a aplicação: V1 e V2 serão aplicadas.
O histórico fica em `flyway_schema_history`. Inicializações posteriores aplicam
somente versões pendentes e verificam os checksums das versões existentes.
Crie uma nova `V3__descricao.sql` para a próxima alteração; não edite migrations
já aplicadas. `baseline-on-migrate=false` e `clean-disabled=true` ficam explícitos.

### Adoção de um banco existente

Pare as instâncias antigas que ainda usam `ddl-auto=update`, faça backup e
confira o esquema em uma cópia do banco antes da primeira implantação.
As tabelas e os tipos devem corresponder a V1; os nomes das constraints podem
diferir. A coluna `google_review_id` e os índices de V2 podem já existir.
Caso faltem campos de V1, prepare uma atualização específica antes do baseline:
o baseline registra uma versão, mas não verifica nem recria esse esquema.

Use a CLI Flyway da mesma versão gerenciada pelo projeto (atualmente 11.14.1).
Configure `FLYWAY_URL`, `FLYWAY_USER` e `FLYWAY_PASSWORD` para o banco conferido,
com o mesmo schema/search_path usado pela aplicação. Dentro de `dashboard-api`:

```sh
flyway -baselineVersion=1 baseline
flyway -locations=filesystem:src/main/resources/db/migration info
flyway -locations=filesystem:src/main/resources/db/migration migrate
flyway -locations=filesystem:src/main/resources/db/migration validate
```

O baseline 1 evita executar V1 sobre tabelas existentes; V2 mantém os dados e
completa as adições recentes. Depois, inicie a nova aplicação com o perfil
`prod`. Não habilite baseline automático permanentemente e não use baseline 2
para ignorar a execução de V2.

Os testes cobrem banco vazio, reaplicação sem alterações, baseline explícito,
preservação dos dados e identidades, esquema já atualizado, unicidade do ID Google
e detecção de checksum alterado. A suíte local usa H2; valide também em uma cópia
PostgreSQL antes de implantar em um banco existente.
