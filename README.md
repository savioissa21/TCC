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
- **Mineração**: Python 3.11, Playwright, pysentimiento (BERT)
- **Infra**: Docker, Nginx
