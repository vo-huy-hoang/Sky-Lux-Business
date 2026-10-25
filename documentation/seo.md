# Sky-Lux CRM - Search Engine Optimization & Route Indexing Policy

## 1. System Classification: Internal Enterprise ERP

Sky-Lux CRM is a private enterprise application designed strictly for authenticated tour operations staff, sales personnel, and executive management.

### Architectural Indexing Principles
1. **Zero Public Indexable Data**: The platform contains proprietary customer lists, pricing structures, margin calculations, supplier contracts, and internal communications. None of this data may ever be indexed by public search engines or social media scrapers.
2. **Universal Authentication Wall**:
   - [frontend/middleware.ts:24-32](file:///d:/Sky-Lux-Business/frontend/middleware.ts#L24-L32) enforces that every route under `/main/*` requires a valid `access_token` cookie.
   - Unauthenticated requests (including search bots) are immediately issued an HTTP 307 redirect to `/auth/login?redirect=...`.
3. **No Social Share Previews (OpenGraph / Twitter Cards)**:
   - Metadata is stripped of dynamic business identifiers. Root [layout.tsx](file:///d:/Sky-Lux-Business/frontend/app/layout.tsx) defines only static title and viewport tags without public OpenGraph preview tags that could leak tenant information.

---

## 2. Route Classification Matrix

| Route Path | Indexing Allowed | Authentication Required | Risk Level | Protection Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| `/` | ❌ No | No | Low | Redirects to `/main/dashboard` or `/auth/login` |
| `/auth/login` | ❌ No | No | Medium | Public login portal; must NOT be indexed |
| `/main/*` (all subroutes) | ❌ No | ✅ Yes | **Critical** | Next.js Edge Middleware redirect (307) |
| `/api/*` | ❌ No | ✅ Yes (Bearer) | **Critical** | NestJS `JwtAuthGuard` returns 401 |
| `/api/docs` (Swagger) | ❌ No | Optional (Dev/Staging) | High | Swagger API documentation; disable in prod |

---

## 3. Crawler Defense Action: Required `robots.txt`

To prevent search crawlers (Googlebot, Bingbot, Yandex, Baidu) from wasting crawl budget or logging 307 redirects on the login portal, [frontend/public/robots.txt](file:///d:/Sky-Lux-Business/frontend/public/robots.txt) must be deployed with the following disallow rule:

```text
User-agent: *
Disallow: /
```
