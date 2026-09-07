# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_CROSS_SYSTEM_URL
ENV NEXT_PUBLIC_CROSS_SYSTEM_URL=$NEXT_PUBLIC_CROSS_SYSTEM_URL
RUN npm run build

# Stage 2: Production (non-root)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built artifacts
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./

# Switch to non-root user
USER nextjs

EXPOSE 3500

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:3500 || exit 1

CMD ["npm", "start"]
