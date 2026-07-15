# =============================================================
# Stage 1: Build do React com Vite
# =============================================================
FROM node:22-alpine AS build

WORKDIR /app

# Instalar dependências (cache layer separado)
COPY package*.json ./
RUN npm ci

# Copiar código e buildar
COPY . .
ENV VITE_API_URL=/api
RUN npm run build

# =============================================================
# Stage 2: Servir com Nginx
# =============================================================
FROM nginx:alpine

# Remover config padrão e usar a nossa
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build do React
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
