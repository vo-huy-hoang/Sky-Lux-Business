# Sky-Lux CRM - Environment Variables, Configuration & Secrets Reference

This document maps all environment variables and secrets across the Sky-Lux CRM platform to their usage, scope, exposure risks, and incident rotation procedures.

---

## 1. Environment Variables Inventory

| Variable Name | Used By | Scope | Source / Default | Rotation Procedure | Security & Operational Risk |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | Backend & Frontend | Server / Build | System env (`production` / `development`) | Redeploy container | Low. Controls debug logging, stack traces, and optimization levels. |
| `APP_PORT` / `PORT` | [main.ts:93](file:///d:/Sky-Lux-Business/backend/src/main.ts#L93) | Server | Env (Default: `3001`) | Restart service | Low. Port binding. |
| `DB_HOST` | [database.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/database.config.ts) | Server | Env (`postgres`) | Update env & restart | Medium. Database network connectivity. |
| `DB_PORT` | [database.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/database.config.ts) | Server | Env (`5432`) | Update env & restart | Low. |
| `DB_NAME` | [database.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/database.config.ts) | Server | Env (`skylux`) | Database migration | Medium. Tenant database name. |
| `DB_USER` | [database.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/database.config.ts) | Server | Env (`skylux`) | Create new DB user, grant permissions, rotate env | High. Direct PostgreSQL access credential. |
| `DB_PASSWORD` | [database.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/database.config.ts) | Server | Env | `ALTER USER skylux WITH PASSWORD '...';`, update env, rolling restart | **Critical**. Full read/write access to all multi-tenant tables. |
| `REDIS_HOST` | [redis.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/redis.config.ts) | Server | Env (`redis`) | Update env & restart | Medium. Redis network connectivity. |
| `REDIS_PORT` | [redis.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/redis.config.ts) | Server | Env (`6379`) | Update env & restart | Low. |
| `REDIS_PASSWORD` | [redis.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/redis.config.ts) | Server | Env (Optional) | `CONFIG SET requirepass`, update env | High. Controls access to auth session cache, rate-limits, and BullMQ jobs. |
| `JWT_SECRET` | [app.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/app.config.ts) | Server | Env | Generate new 256-bit string, update env, restart backend | **Critical**. Compromise allows forging arbitrary user tokens and tenant claims. |
| `SYSTEM_ADMIN_ROLES`| [app.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/app.config.ts) | Server | Env (`SUPER_ADMIN,CEO_ADMIN`) | Update env & restart | High. Controls RBAC guard bypass lists. |
| `CORS_ORIGINS` | [main.ts:43](file:///d:/Sky-Lux-Business/backend/src/main.ts#L43) | Server | Env (`http://localhost:3000,...`) | Update env & restart | High. Misconfiguration enables cross-site request forgery/data exfiltration. |
| `R2_ENDPOINT` | [storage.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/storage.config.ts) | Server | Env (Cloudflare R2 endpoint) | Update endpoint URL | Medium. Object storage gateway. |
| `R2_ACCESS_KEY_ID` | [storage.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/storage.config.ts) | Server | Env | Cloudflare API Tokens | High. Object storage read/write authentication. |
| `R2_SECRET_ACCESS_KEY`| [storage.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/storage.config.ts) | Server | Env | Cloudflare API Tokens | **Critical**. Allows direct reading and overwriting of contract documents and attachments. |
| `R2_BUCKET` | [storage.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/storage.config.ts) | Server | Env (`skylux-files`) | Cloudflare Bucket config | Medium. |
| `R2_PUBLIC_DOMAIN` | [storage.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/storage.config.ts) | Server | Env (`https://files.skylux.vn`) | DNS / CDN record | Medium. CDN domain for file downloads. |
| `NEXT_PUBLIC_API_URL`| [frontend/.env.example](file:///d:/Sky-Lux-Business/frontend/.env.example#L10) | Client & Server | Env (`http://localhost:3001/api`) | Rebuild frontend image | Low. Public API URL exposed to browser. |
| `NEXT_PUBLIC_APP_NAME`| [frontend/.env.example](file:///d:/Sky-Lux-Business/frontend/.env.example#L13) | Client | Env (`"Sky-Lux CRM"`) | Rebuild frontend image | Low. Brand string in UI. |
| `NEXT_PUBLIC_APP_VERSION`| [frontend/.env.example](file:///d:/Sky-Lux-Business/frontend/.env.example#L14) | Client | Env (`1.0.0`) | Rebuild frontend image | Low. Version watermark. |

---

## 2. Client-Side Bundle Leak Verification

An automated audit of Next.js client-facing configuration confirms:
- **Zero Server Secrets Bundled**: Only three variables carry the `NEXT_PUBLIC_` prefix:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_NAME`
  - `NEXT_PUBLIC_APP_VERSION`
- **Secrets Isolated to Server**: `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`, and `R2_SECRET_ACCESS_KEY` are exclusively consumed inside `backend/src/config/` and are never imported into any file under `frontend/`.
- **Edge Middleware Safety**: [frontend/middleware.ts](file:///d:/Sky-Lux-Business/frontend/middleware.ts) only inspects the presence of cookie `access_token` and does not embed any private signing keys into edge runtime chunks.

---

## 3. Pre-Go-Live Security Checklist

Before deploying Sky-Lux CRM to production, verify each of the following mandatory steps:

- [ ] **Rotate Default JWT Secret**: Replace the example `skylux_super_secret_jwt_key_2026_change_in_production` with a cryptographically generated 64-character hex key (`openssl rand -hex 32`).
- [ ] **Rotate Demo User Passwords**: Update the seeded passwords for `admin@skylux.vn`, `ceo@skylux.vn`, `sales@skylux.vn`, `operator@skylux.vn`, and `accountant@skylux.vn` ([initial.seed.ts](file:///d:/Sky-Lux-Business/backend/src/database/seeds/initial.seed.ts)).
- [ ] **Enforce Environment Schema Validation**: Implement schema validation in [backend/src/config/env.validations.ts](file:///d:/Sky-Lux-Business/backend/src/config/env.validations.ts) so the server crashes immediately if required variables are absent.
- [ ] **Restrict CORS Origins**: Set `CORS_ORIGINS` to the exact production domains (e.g. `https://crm.skylux.vn`), removing any `localhost` or wildcards.
- [ ] **Configure Object Storage Credentials**: Point `R2_*` variables to production Cloudflare R2 bucket with restrictive IAM token policies (scoped to `skylux-files` bucket only).
- [ ] **Enable Redis Authentication**: Ensure `REDIS_PASSWORD` is configured in production and Redis port 6379 is not bound to public interfaces.
- [ ] **Deploy Crawler Defense**: Add [robots.txt](file:///d:/Sky-Lux-Business/frontend/public/robots.txt) containing `User-agent: * \n Disallow: /` to `frontend/public/`.
