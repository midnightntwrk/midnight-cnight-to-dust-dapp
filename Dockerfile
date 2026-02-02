# syntax=docker/dockerfile:1.7

# Stage 1: Dependencies
FROM node:20.19.0-alpine3.20 AS deps
WORKDIR /app

# Copy yarn configuration and release
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --immutable

# Stage 2: Builder
FROM node:20.19.0-alpine3.20 AS builder
WORKDIR /app

# Build with placeholder values that will be replaced at runtime
# These placeholders MUST match those in docker-entrypoint.sh
ENV NEXT_PUBLIC_CARDANO_NET=__NEXT_PUBLIC_CARDANO_NET__ \
    NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW=__NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW__ \
    NEXT_PUBLIC_BLOCKFROST_URL_PREPROD=__NEXT_PUBLIC_BLOCKFROST_URL_PREPROD__ \
    NEXT_PUBLIC_BLOCKFROST_URL_MAINNET=__NEXT_PUBLIC_BLOCKFROST_URL_MAINNET__ \
    NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW=__NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW__ \
    NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD=__NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD__ \
    NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET=__NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET__ \
    NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID=__NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID__ \
    NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_POLICY_ID=__NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_POLICY_ID__ \
    NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_POLICY_ID=__NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_POLICY_ID__ \
    NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME=__NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME__ \
    NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME=__NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME__ \
    NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_ENCODEDNAME=__NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_ENCODEDNAME__ \
    NEXT_PUBLIC_INDEXER_ENDPOINT=__NEXT_PUBLIC_INDEXER_ENDPOINT__ \
    NEXT_PUBLIC_REACT_SERVER_API_URL=__NEXT_PUBLIC_REACT_SERVER_API_URL__

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# Stage 3: Runner
FROM node:20.19.0-alpine3.20 AS runner
WORKDIR /app

# Install security updates and remove unnecessary packages
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Copy entrypoint script (must be root-owned and executable)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy application files (root-owned, readable by all)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy only the specific packages with WASM files needed at runtime
# Midnight network packages
COPY --from=deps /app/node_modules/@midnight-ntwrk/ledger-v7 ./node_modules/@midnight-ntwrk/ledger-v7
COPY --from=deps /app/node_modules/@midnight-ntwrk/zswap ./node_modules/@midnight-ntwrk/zswap

# Cardano packages with WASM
COPY --from=deps /app/node_modules/@anastasia-labs ./node_modules/@anastasia-labs
COPY --from=deps /app/node_modules/@blaze-cardano/uplc ./node_modules/@blaze-cardano/uplc
COPY --from=deps /app/node_modules/@emurgo ./node_modules/@emurgo
COPY --from=deps /app/node_modules/@lucid-evolution/core-utils ./node_modules/@lucid-evolution/core-utils
COPY --from=deps /app/node_modules/@lucid-evolution/uplc ./node_modules/@lucid-evolution/uplc

# Make .next writable by nextjs user for runtime env injection
RUN chown -R nextjs:nodejs /app/.next

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
