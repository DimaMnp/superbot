# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app



RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retry-maxtimeout 300000 && \
    npm config set fetch-retry-mintimeout 10000

# Копируем package.json
COPY package*.json ./

# Устанавливаем все зависимости для сборки
RUN npm ci --verbose

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production образ
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Устанавливаем зависимости включая TypeScript
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
#COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Если используете standalone mode, раскомментируйте:
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["npm", "start"]