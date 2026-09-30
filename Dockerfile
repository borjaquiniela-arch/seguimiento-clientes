FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server ./server
COPY web ./web
COPY electron ./electron
RUN npm install --include=dev && npm run build:web && npm prune --omit=dev
ENV PORT=8787
ENV DATA_DIR=/data
EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "server/index.js"]
