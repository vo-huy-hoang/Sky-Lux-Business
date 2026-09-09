FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install


FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

RUN npm prune --omit=dev


FROM node:20-alpine AS runner


WORKDIR /app


ENV NODE_ENV=production


RUN addgroup --system --gid 1001 nestjs \
 && adduser --system --uid 1001 nestjs


COPY --from=builder \
 --chown=nestjs:nestjs \
 /app/node_modules ./node_modules


COPY --from=builder \
 --chown=nestjs:nestjs \
 /app/dist ./dist


COPY --from=builder \
 --chown=nestjs:nestjs \
 /app/package*.json ./

RUN mkdir -p /app/uploads/imports && chown -R nestjs:nestjs /app

USER nestjs


EXPOSE 3001


CMD ["node","dist/main.js"]