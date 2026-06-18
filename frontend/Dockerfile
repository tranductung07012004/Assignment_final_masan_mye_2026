# ========== Stage 1: Build ==========
FROM node:22-alpine AS build
WORKDIR /app

# Cache dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build (Vite mang env vào bundle lúc build nên phải truyền qua ARG)
COPY . .
ARG VITE_API_BASE_URL=http://localhost
ARG VITE_WS_BASE_URL=ws://localhost
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
RUN npm run build

# ========== Stage 2: Serve (static SPA) ==========
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
