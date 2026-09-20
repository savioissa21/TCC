# Operação do NEXO

Este documento cobre a inicialização, atualização e recuperação do ambiente
Docker. Execute os comandos na raiz do repositório.

## Inicialização do zero

1. Copie `.env.example` para `.env` e preencha `DB_PASSWORD`, `JWT_SECRET`,
   `ABSA_MODEL_HOST_PATH` e `ABSA_MODEL_SHA256`.
2. Valide o artefato local:

   ```bash
   python minerador-py/validate_absa_model.py --model-path ./minerador-py/artifacts/bertimbau-absa --sha256 HASH_PUBLICADO
   ```

3. Construa e inicie:

   ```bash
   docker compose up -d --build
   docker compose ps
   docker compose logs api
   ```

O banco, a API e o frontend devem ficar `healthy`. O endpoint
`http://localhost:8080/api/health` só retorna `UP` após consultar o PostgreSQL.

## Backup e restauração

Pause o agendamento antes de uma manutenção definindo
`MINING_SCHEDULE_ENABLED=false` no `.env` e recriando a API. Depois faça um
backup lógico consistente:

```bash
docker compose exec -T db pg_dump -U postgres -d dashboard_tcc -Fc > nexo.dump
```

Substitua usuário e banco se `DB_USERNAME`/`DB_NAME` forem diferentes. Teste a
restauração em um banco descartável antes de depender do arquivo:

```bash
docker compose exec -T db createdb -U postgres nexo_restore_test
docker compose exec -T db pg_restore -U postgres -d nexo_restore_test --clean --if-exists < nexo.dump
```

Confira as tabelas e contagens no banco restaurado e remova somente o banco de
teste quando terminar. Nunca use `docker compose down -v` no ambiente real como
forma de atualização: a opção `-v` apaga o volume do PostgreSQL.

## Aplicação de migrations

As migrations Flyway são aplicadas automaticamente antes do JPA. Antes de uma
atualização:

1. faça e teste o backup;
2. execute `./mvnw -Ppostgres verify`;
3. confira colisões de e-mail que impediriam a V4:

   ```sql
   SELECT LOWER(TRIM(email)), COUNT(*)
   FROM users
   GROUP BY LOWER(TRIM(email))
   HAVING COUNT(*) > 1;
   ```

4. teste a nova imagem contra uma cópia restaurada;
5. atualize a produção e confira `flyway_schema_history`, `/api/health` e logs.

Migrations aplicadas nunca devem ser editadas. Uma alteração posterior deve
receber nova versão. Se uma migration falhar, preserve o volume, corrija a causa
e só tente novamente depois de validar uma cópia.

## Atualização do checkpoint

O checkpoint fica fora do Git e da imagem, montado somente para leitura.
Publique cada versão em armazenamento de artefatos junto de seu SHA-256. Para
trocar a versão:

1. baixe para um novo diretório, sem sobrescrever a versão ativa;
2. valide classes, tokenizer, pesos e hash com `validate_absa_model.py`;
3. altere `ABSA_MODEL_HOST_PATH` e `ABSA_MODEL_SHA256` no `.env`;
4. recrie a API e verifique o preflight nos logs;
5. execute uma inferência conhecida antes de liberar coletas.

## Rollback

O rollback de aplicação consiste em voltar à imagem/commit anterior. Não faça
rollback destrutivo do schema manualmente. Se a versão anterior não aceitar o
schema novo, restaure o backup em um volume/banco separado e aponte a aplicação
anterior para ele. Mantenha o banco original intacto até validar contagens,
login, lojas, avaliações, aspectos e jobs.

Para rollback do modelo, restaure juntos o diretório anterior e seu hash. Nunca
altere apenas `ABSA_MODEL_SHA256` para fazer um artefato desconhecido passar.

## Verificação após atualização

- cadastro e login com e-mail normalizado;
- criação de loja e URL do Google Maps;
- estado `QUEUED`, `RUNNING`, `COMPLETED` ou `FAILED` visível após recarregar;
- segunda conta sem acesso aos dados da primeira;
- duas coletas consecutivas sem duplicação;
- filtros, paginação e exclusão da loja correta;
- logs sem token, senha ou caminho de segredo.

O ambiente `compose.e2e.yml` é descartável e pode ser removido com `down -v`;
esse comando se aplica somente ao projeto E2E, nunca ao Compose de produção.
