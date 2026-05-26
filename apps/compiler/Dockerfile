# =============================================================================
# Compiler microservice — Typst + Node 20
# =============================================================================
# Multi-stage build:
#   1. typst-bin : download the official Typst binary
#   2. build     : install pnpm workspace deps + compile TypeScript
#   3. deploy    : `pnpm deploy` produces a self-contained runtime folder
#   4. runtime   : minimal node + typst image running the deployed bundle
# =============================================================================

ARG TYPST_VERSION=0.14.0
ARG NODE_VERSION=20.18.0

# -----------------------------------------------------------------------------
# Stage 1 — fetch the Typst binary
# -----------------------------------------------------------------------------
FROM debian:bookworm-slim AS typst-bin
ARG TYPST_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && ARCH="$(uname -m)" \
    && case "$ARCH" in \
         x86_64)  TARGET="x86_64-unknown-linux-musl" ;; \
         aarch64) TARGET="aarch64-unknown-linux-musl" ;; \
         *) echo "unsupported arch: $ARCH" && exit 1 ;; \
       esac \
    && curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${TARGET}.tar.xz" -o /tmp/typst.tar.xz \
    && mkdir -p /opt/typst \
    && tar -xJf /tmp/typst.tar.xz -C /opt/typst --strip-components=1 \
    && rm /tmp/typst.tar.xz \
    && /opt/typst/typst --version

# -----------------------------------------------------------------------------
# Stage 2 — build TypeScript (compiler is self-contained: no workspace deps)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# The compiler does NOT import any workspace packages at runtime — the Zod
# schema for the request is inlined in src/server.ts. So we can install
# directly inside apps/compiler with `node-linker=hoisted` for a clean
# self-contained node_modules tree.
COPY apps/compiler/package.json ./
RUN echo "node-linker=hoisted" > .npmrc \
 && pnpm install --no-frozen-lockfile

COPY apps/compiler/tsconfig.json ./
COPY apps/compiler/src ./src
RUN pnpm exec tsc -p tsconfig.json \
 && cp -r src/templates dist/templates

# Strip dev deps for the runtime image.
RUN pnpm prune --prod

# -----------------------------------------------------------------------------
# Stage 3 — minimal runtime
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY --from=typst-bin /opt/typst/typst /usr/local/bin/typst

WORKDIR /app

COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    XDG_CACHE_HOME=/tmp/typst-cache

EXPOSE 8787

HEALTHCHECK --interval=20s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
