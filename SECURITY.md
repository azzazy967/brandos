# Security policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through [GitHub's private vulnerability reporting](https://github.com/azzazy967/brandos/security/advisories/new) on this repository.

Include what you found, how to reproduce it, and what an attacker could do with it. You will get an acknowledgement, and a fix or an explanation of why it is not exploitable.

## Scope

Brand OS stores commercial data and third-party integration credentials. The areas that matter most:

- Authentication and JWT handling (`backend/src/middleware/auth.ts`)
- Role-based access control (`backend/src/middleware/rbac.ts`)
- Credential encryption at rest (`backend/src/lib/encryption.ts`)
- Carrier webhook signature verification (`backend/src/routes/webhooks.ts`)
- Any route that returns data across brand boundaries

## Running Brand OS safely

- Generate fresh `JWT_SECRET`, `ENCRYPTION_KEY` and `POSTGRES_PASSWORD` per deployment. The stack refuses to start without them rather than falling back to a default.
- Delete the seeded `admin@brandos.eg` account before the app is reachable by anyone else.
- Terminate TLS in front of the app and set `CORS_ORIGIN` to that exact HTTPS origin.
- Leave PostgreSQL and Redis unpublished — `docker-compose.yml` does not map their ports to the host, and it should stay that way.
- Set `ARAMEX_WEBHOOK_SECRET` if you use Aramex; unsigned webhooks are rejected.

## Supported versions

The `main` branch is the only supported version. Fixes land there.
