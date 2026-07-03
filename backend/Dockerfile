# NOTE: build context for this Dockerfile is the project root (see docker-compose.yml)
FROM node:20-alpine AS base
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ .
RUN npx prisma generate

EXPOSE 5000
CMD ["node", "src/server.js"]
