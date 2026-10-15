FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_DEMO_MODE=false
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE VITE_API_URL=$VITE_API_URL VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
RUN mkdir -p /app/.local/uploads && chown -R node:node /app/.local
USER node
EXPOSE 4000
CMD ["node", "server/index.js"]
