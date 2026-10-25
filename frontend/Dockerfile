FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY scripts/patch-next.js ./scripts/patch-next.js

RUN npm install


FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1


RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs


COPY --from=builder /app/public ./public

COPY --from=builder \
 --chown=nextjs:nodejs \
 /app/.next/standalone ./


COPY --from=builder \
 --chown=nextjs:nodejs \
 /app/.next/static ./static-dist

COPY --from=builder \
 --chown=nextjs:nodejs \
 /app/.next/static ./.next/static

COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh


USER nextjs

EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]

CMD ["node","server.js"]
