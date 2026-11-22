# Install from published Docker images

Prebuilt images on GitHub Container Registry (GHCR) mean you only need Docker: no source checkout and no local build.

## Quick start

Create a `.env` file in an empty directory with the three required secrets, then download the standalone compose file and start the stack:

```bash
cat > .env <<EOT
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
CORS_ORIGIN=http://localhost:3001
EOT

curl -O https://raw.githubusercontent.com/azzazy967/brandos/main/docker-compose.published.yml
export COMPOSE_FILE=docker-compose.published.yml
docker compose up -d
```

`COMPOSE_FILE` points every later `docker compose` command at the downloaded file. Set it again in a new shell, or pass `-f docker-compose.published.yml` instead. Compose reads the secrets from `.env` next to that file and refuses to start if any of the three are missing.

## Apply the schema and seed demo data

```bash
docker compose exec backend npx prisma db push
docker compose exec backend npx tsx prisma/seed.ts
```

The seed command is optional. Open **http://localhost:3001** and sign in with `admin@brandos.eg` / `pass123`. Change or delete that account before exposing the app to anyone else.

## Image tags

Images are published from `main` on every backend or frontend change, and on published releases, so `:latest` tracks `main`. Pull the newest images at any time with `docker compose pull` followed by `docker compose up -d`.

Each build also gets a short-SHA tag such as `sha-1a2b3c4`. For a reproducible install, use the same SHA tag for both images - find it in the workflow run or the package tag list on GHCR:

```bash
docker pull ghcr.io/azzazy967/brandos-backend:sha-1a2b3c4
docker pull ghcr.io/azzazy967/brandos-frontend:sha-1a2b3c4
```

Then edit the two `image:` lines in `docker-compose.published.yml` to use that tag instead of `:latest`, and run `docker compose up -d`.
