FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build Vite frontend
RUN npm run build

# Bundle server.ts into a single JS file using esbuild (already in devDeps via vite)
RUN npx esbuild server.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=esm \
    --outfile=server.mjs \
    --external:express \
    --external:cors \
    --external:cookie-parser \
    --external:express-session \
    --external:google-auth-library

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server.mjs"]
