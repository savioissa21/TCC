FROM maven:3.9.9-eclipse-temurin-21 AS java-build
WORKDIR /build
COPY dashboard-api/pom.xml .
COPY dashboard-api/src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -Dmaven.test.skip=true package

# Base comum: o JAR sempre é compilado a partir do código do contexto.
FROM python:3.11-slim-trixie AS runtime-base

# Nota: Debian Trixie usa openjdk-21 e libasound2t64
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-21-jre-headless \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libcups2t64 \
    libdrm2 \
    libdbus-1-3 \
    libexpat1 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    libatspi2.0-0t64 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=java-build /build/target/dashboard-0.0.1-SNAPSHOT.jar /app/app.jar

# Apenas compose.e2e.yml seleciona este alvo. Não é fallback de produção.
FROM runtime-base AS e2e
COPY tests/fixtures/miner_fixture.py /app/fixtures/miner_fixture.py
ENV MINING_PYTHON_EXECUTABLE=python3
ENV MINING_PYTHON_SCRIPT_PATH=/app/fixtures/miner_fixture.py
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# Alvo padrão: checkpoint e validação de SHA continuam obrigatórios.
FROM runtime-base AS production

# Copiar requirements e instalar dependências Python
COPY minerador-py/requirements.txt /app/minerador-py/requirements.txt
RUN pip install --no-cache-dir -r /app/minerador-py/requirements.txt

# Instalar Playwright e browsers (somente chromium)
RUN playwright install chromium

# Copiar script Python do minerador
COPY minerador-py/ /app/minerador-py/

# Variáveis de ambiente
ENV SPRING_PROFILES_ACTIVE=prod
ENV MINING_PYTHON_EXECUTABLE=python3
ENV MINING_PYTHON_SCRIPT_PATH=/app/minerador-py/minerador_integrado.py
ENV ABSA_MODEL_PATH=/models/bertimbau-absa
ENV PYTHONUNBUFFERED=1
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "python3 /app/minerador-py/validate_absa_model.py && exec java -jar /app/app.jar"]
