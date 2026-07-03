# NOTE: build context for this Dockerfile is the project root (see docker-compose.yml)
FROM node:20-alpine
WORKDIR /app

COPY bridge/package*.json ./
RUN npm install --omit=dev

COPY bridge/ .

# The PlusOne snapshot is mounted as a volume (see docker-compose.yml) so it
# can be refreshed without rebuilding the image — see bridge/README.md.
EXPOSE 5050
CMD ["node", "src/server.js"]
