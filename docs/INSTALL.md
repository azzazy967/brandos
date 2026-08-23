# Installation guide

How to install and run **Brand OS** — the open-source e-commerce profitability and operations dashboard — either with Docker or directly on your machine.

- [Requirements](#requirements)
- [Option A — Docker Compose (recommended)](#option-a--docker-compose-recommended)
- [Option B — local development without Docker](#option-b--local-development-without-docker)
- [Database schema and demo data](#database-schema-and-demo-data)
- [Environment variables](#environment-variables)
- [Production deployment](#production-deployment)
- [Upgrading](#upgrading)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Dependency | Version | Needed for |
|---|---|---|
| Docker + Docker Compose | v2 | Option A |
| Node.js | 22.x | Option B |
| PostgreSQL | 16 | Option B |
| Redis | 7 | Option B |
| `openssl` | any | Generating secrets |

---

## Option A — Docker Compose (recommended)

Brings up PostgreSQL, Redis, the API and the nginx-served web app as four containers.

### 1. Clone

```bash
git clone https://github.com/azzazy967/brandos.git
cd brandos
```

### 2. Create secrets

Compose reads these from a `.env` file next to `docker-compose.yml`. The stack refuses to start without them — by design, so no deployment ever silently runs on a default key.

```bash
cat > .env <<EOT
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
CORS_ORIGIN=http://localhost:3001
EOT
```

A 64-character hex `ENCRYPTION_KEY` is decoded and used directly as the AES-256 key. Any other string is accepted but gets SHA-256 hashed down to 32 bytes first, so prefer the hex form.

Optionally add `ANTHROPIC_API_KEY=sk-ant-...` to enable AI insights. Everything else works without it.

### 3. Build and start

```bash
docker compose up -d --build
docker compose ps
```

You should see `backend`, `frontend`, `db` and `redis` all healthy or running.

### 4. Apply the schema

```bash
docker compose exec backend npx prisma db push
```

### 5. Load demo data (optional)

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

### 6. Open the app

**http://localhost:3001**

Seeded login: `admin@brandos.eg` / `pass123`. **Delete or change this account before the app is reachable by anyone else.**

---

## Option B — local development without Docker

Useful when you want hot reload on both ends.

### 1. Start PostgreSQL and Redis

Either install them natively, or run just the datastores in Docker:

```bash
docker compose up -d db redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env       # then edit the values
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts     # optional demo data
npm run dev                # http://localhost:4000
```

`--legacy-peer-deps` is required because some Prisma 6 and Express 5 type packages still declare older peer ranges.

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev                # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:4000`, so no frontend environment variables are needed. Set `CORS_ORIGIN=http://localhost:5173` in `backend/.env` to match.

---

## Database schema and demo data

The project uses Prisma with **no committed migration history** — the schema is applied with `db push`:

```bash
cd backend
npx prisma db push        # sync schema to the database
npx prisma studio         # browse data in the browser
npx tsx prisma/seed.ts    # (re)load demo brand, products and orders
```

If you start contributing schema changes, generate a real migration instead:

```bash
npx prisma migrate dev --name your_change
```

---

## Environment variables

Full list, with the same defaults documented in [`backend/.env.example`](../backend/.env.example):

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `postgresql://postgres:pw@localhost:5432/brandos?schema=public` | |
| `JWT_SECRET` | yes | 64 hex chars | Rotating it signs everyone out. |
| `ENCRYPTION_KEY` | yes | 64 hex chars | AES-256 key for stored integration credentials. **Rotating it makes existing saved credentials unreadable** — re-enter them afterwards. |
| `REDIS_URL` | yes | `redis://localhost:6379` | BullMQ job queue. |
| `CORS_ORIGIN` | yes | `http://localhost:5173` | Must exactly match the browser origin. |
| `PORT` | no | `4000` | |
| `ANTHROPIC_API_KEY` | no | `sk-ant-...` | Enables AI insights. |
| `ARAMEX_WEBHOOK_SECRET` | no | random string | Verifies `x-aramex-signature` on delivery webhooks. |

---

## Production deployment

1. Point a domain at the host and terminate TLS at a reverse proxy (nginx, Caddy or Traefik) in front of port `3001`.
2. Set `CORS_ORIGIN` to the public HTTPS origin — not an IP, not `*`.
3. Generate fresh `POSTGRES_PASSWORD`, `JWT_SECRET` and `ENCRYPTION_KEY`; never reuse the development values.
4. Leave the `db` and `redis` services unpublished. `docker-compose.yml` deliberately does not map their ports to the host — only the frontend and API are reachable.
5. Delete the seeded `admin@brandos.eg` account.
6. Back up the `pgdata` volume:

```bash
docker compose exec db pg_dump -U postgres brandos | gzip > brandos-$(date +%F).sql.gz
```

---

## Upgrading

```bash
git pull
docker compose up -d --build
docker compose exec backend npx prisma db push
```

Check the diff on `backend/prisma/schema.prisma` before pushing schema changes against a database holding real data.

---

## Troubleshooting

**`JWT_SECRET must be set` on `docker compose up`**
The `.env` file next to `docker-compose.yml` is missing or incomplete. Recreate it as shown in step 2.

**Backend exits immediately, logs show `Can't reach database server`**
Postgres has not finished starting. Compose already waits on its healthcheck, so this usually means `POSTGRES_PASSWORD` in `.env` no longer matches the password baked into an existing `pgdata` volume. Either restore the old password or reset the volume with `docker compose down -v` — which deletes all data.

**CORS errors in the browser console**
`CORS_ORIGIN` does not match the origin you are loading the app from, including scheme and port.

**`npm install` fails with peer dependency errors**
Use `npm install --legacy-peer-deps`, as both Dockerfiles do.

**Blank page on the frontend, `/api` returns 502**
The backend container is down. Check `docker compose logs backend`.

**AI insights return an error**
`ANTHROPIC_API_KEY` is unset or invalid. Every other module works without it.
