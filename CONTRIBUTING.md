# Contributing to Brand OS

Thanks for your interest. Bug reports, fixes and features are all welcome.

## Getting set up

Follow [docs/INSTALL.md](docs/INSTALL.md) — Option B gives you hot reload on both the API and the web app.

## Before you open a pull request

1. **Open an issue first** for anything larger than a bug fix, so the approach can be agreed before you spend time on it.
2. **Keep the diff focused.** One concern per pull request.
3. **Never commit secrets.** No `.env` files, API keys, real customer data or production hostnames. `docker-compose.yml` and `backend/.env.example` must stay placeholder-only.

## Conventions

- **TypeScript everywhere.** No `any` in new code where a real type is available.
- **Validation at the boundary.** Every request body goes through a Zod schema before it reaches business logic.
- **Business logic lives in `backend/src/lib/`**, not in route handlers. Routes fetch, delegate and respond.
- **Money is never fabricated.** Margin, ROAS and COD figures must be derived from stored data — no illustrative constants.
- **Files stay under 800 lines, functions under 50.** Split rather than nest.
- **Frontend follows `design-system/MASTER.md`.** If a `design-system/pages/<page>.md` exists, it overrides the master file for that screen.

## Commit messages

Conventional commits:

```
feat: add per-size restock forecasting
fix: guard toFixed against null COGS on product detail
docs: document ENCRYPTION_KEY rotation impact
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

## Schema changes

The repository has no committed migration history — the schema is applied with `prisma db push`. If your change alters `schema.prisma`, say so explicitly in the pull request description so it is not missed on deploy.

## Reporting bugs

Include the module, what you expected, what happened, and relevant output from `docker compose logs backend`. Redact tokens and customer data first.

Security issues go to [SECURITY.md](SECURITY.md) instead — not the public issue tracker.
