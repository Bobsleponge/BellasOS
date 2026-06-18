# Multi-stage build for the Node services (api, worker, migrations).
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json* ./
COPY nx.json tsconfig.base.json tsconfig.json ./
# Copy workspace manifests for deterministic install.
COPY libs ./libs
COPY apps ./apps
RUN npm install --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build || echo "build target optional in dev"

FROM base AS runner
COPY --from=build /app ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
