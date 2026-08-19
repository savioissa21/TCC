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

### 1. Compilar a API
```bash
cd dashboard-api
./mvnw clean package -DskipTests
```

### 2. Subir todos os serviços
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
