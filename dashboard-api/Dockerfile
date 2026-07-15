# =============================================================
# Runtime — Python + Playwright + JRE 21
# O JAR já é construído localmente antes do docker compose up
# =============================================================
FROM python:3.11-slim

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

# Copiar requirements e instalar dependências Python
COPY minerador-py/requirements.txt /app/minerador-py/requirements.txt
RUN pip install --no-cache-dir -r /app/minerador-py/requirements.txt

# Instalar Playwright e browsers (somente chromium)
RUN playwright install chromium

# Copiar script Python do minerador
COPY minerador-py/ /app/minerador-py/

# Copiar JAR pré-compilado localmente
COPY dashboard-api/target/dashboard-0.0.1-SNAPSHOT.jar app.jar

# Variáveis de ambiente
ENV SPRING_PROFILES_ACTIVE=prod
ENV MINING_PYTHON_EXECUTABLE=python3
ENV MINING_PYTHON_SCRIPT_PATH=/app/minerador-py/minerador_integrado.py
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
