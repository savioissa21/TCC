# TCC — Dashboard de Inteligência de Negócios

Monorepo do Trabalho de Conclusão de Curso. Sistema de análise de sentimentos de avaliações do Google Maps com dashboard de BI.

## Estrutura

```
TCC/
├── dashboard-api/      # API Spring Boot (Java 21) + JWT + PostgreSQL
├── dashboard-front/    # Frontend React + Vite + TailwindCSS
├── minerador-py/       # Minerador Python (Playwright + pysentimiento)
└── docker-compose.yml  # Orquestração Docker
```

## Como rodar com Docker

### Pré-requisitos
- Docker Desktop
- Java 21 (para buildar o JAR localmente)

### 1. Configurar os segredos

Copie `.env.example` para `.env` e preencha `DB_PASSWORD` e `JWT_SECRET`
com valores novos e aleatórios. O arquivo `.env` é ignorado pelo Git e não
entra no contexto de build do Docker.

Para gerar uma chave JWT segura, use pelo menos 32 bytes aleatórios:

```bash
openssl rand -base64 48
```

Não reutilize a chave que já esteve versionada. Alterar `JWT_SECRET` invalida
os tokens existentes e exige que os usuários façam login novamente.

Se o repositório já tiver sido enviado para um servidor, apagar os valores dos
arquivos atuais não os remove do histórico do Git. Considere os valores antigos
comprometidos, faça a rotação primeiro e planeje separadamente a limpeza do
histórico com a equipe antes de qualquer `force push`.

Se o volume do PostgreSQL já existir, mudar `POSTGRES_PASSWORD` no Compose não
altera automaticamente a senha do banco inicializado. Primeiro altere a senha
do usuário no PostgreSQL e depois coloque o mesmo valor em `DB_PASSWORD`.

### 2. Disponibilizar o BERTimbau ABSA

O checkpoint treinado não é armazenado no Git nem incorporado à imagem Docker.
Baixe uma versão publicada em armazenamento de artefatos, ou gere-a seguindo
[`minerador-py/README_TREINO_ABSA.md`](minerador-py/README_TREINO_ABSA.md). A
pasta precisa conter, no mínimo:

```text
bertimbau-absa/
├── config.json
├── model.safetensors          # ou pytorch_model.bin
├── tokenizer_config.json
└── vocab.txt                  # ou outro vocabulário salvo pelo tokenizer
```

Configure `ABSA_MODEL_HOST_PATH` no `.env` com o caminho dessa pasta. O valor do
`.env.example` aponta para a saída padrão do treino local:

```dotenv
ABSA_MODEL_HOST_PATH=./minerador-py/artifacts/bertimbau-absa
ABSA_MODEL_SHA256=<sha256-do-checkpoint-publicado>
```

Preencha `ABSA_MODEL_SHA256` com os 64 caracteres fornecidos junto do artefato.
O hash cobre todos os arquivos da pasta, incluindo pesos, configuração,
tokenizer e relatórios. Para validar um checkpoint local e calcular o valor:

```bash
python minerador-py/validate_absa_model.py \
  --model-path ./minerador-py/artifacts/bertimbau-absa \
  --print-sha256
```

O Compose monta o diretório como `/models/bertimbau-absa` em modo somente
leitura. Antes de iniciar a API, o contêiner verifica configuração, pesos,
tokenizer, arquitetura e as classes `Negativo`, `Neutro` e `Positivo`, carrega o
modelo localmente e executa uma inferência curta. Se o checkpoint estiver
ausente, corrompido, incompleto ou for de outro classificador, a API encerra com
uma mensagem `[FATAL]`. O SHA-256 do diretório completo também precisa coincidir
com a versão publicada; não existe mais fallback ABSA para BERTweet.

Para validar o modelo antes de subir o ambiente:

```bash
python minerador-py/validate_absa_model.py \
  --model-path ./minerador-py/artifacts/bertimbau-absa \
  --sha256 <sha256-do-checkpoint>
```

O BERTweet permanece somente na análise de sentimento geral. A polaridade de
cada aspecto é calculada obrigatoriamente pelo BERTimbau treinado.

### 3. Compilar a API
```bash
cd dashboard-api
./mvnw clean package -DskipTests
```

### 4. Subir todos os serviços
```bash
docker compose up -d --build
```

### Acesso
| Serviço   | URL                   |
|-----------|-----------------------|
| Frontend  | http://localhost      |
| API       | http://localhost:8080 |
| Banco     | localhost:5432        |

## Stack
- **Backend**: Spring Boot 4, Spring Security, JWT, JPA/Hibernate
- **Frontend**: React, Vite, TypeScript, TailwindCSS
- **Banco**: PostgreSQL 15
- **Mineração**: Python 3.11, Playwright, BERTweet e BERTimbau ABSA
- **Infra**: Docker, Nginx

## Atualização contínua das avaliações

Cada estabelecimento é atualizado automaticamente a cada sete dias. O agendador
verifica de hora em hora quais lojas estão vencidas, ordena o Google Maps por
**Mais recentes**, coloca as coletas em uma fila única e importa somente
avaliações ainda não armazenadas. A tela **Minhas Lojas** também permite
atualizar imediatamente ou pausar a rotina automática.

Configurações da API:

| Propriedade | Padrão | Finalidade |
|---|---:|---|
| `mining.schedule.enabled` | `true` | Ativa o agendador |
| `mining.schedule.interval` | `PT168H` | Intervalo de sete dias |
| `mining.schedule.retry-interval` | `PT24H` | Nova tentativa após erro |
| `mining.schedule.poll-delay-ms` | `3600000` | Frequência de verificação |

Os textos já coletados permanecem no PostgreSQL com a data de coleta. O
identificador estável e uma impressão digital do conteúdo evitam duplicação,
inclusive para registros antigos que ainda possuam UUID aleatório.
