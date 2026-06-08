ARG NODE_BASE_IMAGE=node:22-alpine
FROM ${NODE_BASE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

FROM ${NODE_BASE_IMAGE} AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY . .
# Brand identity PNG/ICO files from repo-level canonical source
COPY --from=brand_context / ./public/assets/brand/
RUN npm run build

FROM ${NODE_BASE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3230
# Next.js standalone server binds to $HOSTNAME; Docker sets HOSTNAME to the
# container id, so without this it listens only on the container IP and a
# 127.0.0.1 healthcheck cannot reach it. Bind all interfaces instead.
ENV HOSTNAME=0.0.0.0
ENV PORT=3230
CMD ["node", "server.js"]
