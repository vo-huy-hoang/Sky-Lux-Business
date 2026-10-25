# Sky-Lux CRM - Permissions & Access Control Reference

This document defines the static authorization baseline for Sky-Lux CRM: roles, claims derivation, resource-by-operation access matrix, and row-level security enforcement mechanisms.

---

## 1. Roles & Scope Hierarchy

Sky-Lux CRM implements a multi-tier Role-Based Access Control (RBAC) model across 5 standard system roles:

| Role Code | Role Name | System Role | Primary Operational Responsibility | Scope Default |
| :--- | :--- | :---: | :--- | :--- |
| `SUPER_ADMIN` | Quản Trị Viên Hệ Thống | Yes | Platform infrastructure, provisioning new organizations, global tenant oversight. | `ALL` (System-wide) |
| `CEO_ADMIN` | Ban Giám Đốc (CEO) | Yes | Executive oversight of a single organization: dossier approvals, financial summaries, KPI targets. | `ALL` (Organization-wide) |
| `SALES` | Chuyên Viên Kinh Doanh | No | Lead generation, customer management, tour dossier drafting, cost/revenue estimates, customer payment tracking. | `OWN` / `TEAM` |
| `OPERATOR` | Chuyên Viên Điều Hành | No | Tour operations, supplier coordination, service costing reviews, operational task execution. | `OWN` / `TEAM` |
| `ACCOUNTANT` | Kế Toán Doanh Nghiệp | No | Supplier payment disbursements, customer receipts reconciliation, accounting period locking/closing. | `ALL` (Organization-wide) |

---

## 2. Token Claims vs. Runtime Derivation

### Claims Issued in JWT Payload
Upon successful authentication at `POST /api/auth/login`, the issued JWT token contains:
- `id`: User UUID.
- `email`: User email address.
- `organizationId`: Tenant UUID.
- `departmentId`: Department UUID (or null).
- `roles`: String array of assigned role codes (e.g. `['SALES']`).
- `permissions`: String array of specific permission codes assigned via roles.
- `authVersion`: Integer sequence counter for session invalidation.

### Runtime Scope & Invalidation Verification
Rather than trusting claims unconditionally until token expiration:
1. **Fast-Path Verification ([JwtAuthGuard:48-62](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-auth.guard.ts#L48-L62))**: Every inbound request inspects Redis cache key `user:auth-meta:${id}`.
2. **Freshness Invalidation**: If the user's role is reassigned, account is locked, or password changed, `authVersion` increments in PostgreSQL and the Redis key is deleted. Subsequent requests from that JWT immediately evaluate to `401 Unauthorized`.
3. **Admin Bypass Rule ([RolesGuard:48-52](file:///d:/Sky-Lux-Business/backend/src/common/guards/roles.guard.ts#L48-L52), [PermissionsGuard:46-51](file:///d:/Sky-Lux-Business/backend/src/common/guards/permissions.guard.ts#L46-L51))**:
   Users possessing `SUPER_ADMIN` or `CEO_ADMIN` (defined in `SYSTEM_ADMIN_ROLES`) bypass standard `@Roles()` and `@RequirePermissions()` checks at the guard level.
4. **Narrow Super-Admin Guard**:
   Endpoints that must restrict even `CEO_ADMIN` (e.g. creating other organizations, cross-tenant listing, creating CEO accounts) implement explicit controller-level checks ([organizations.controller.ts:95-103](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.controller.ts#L95-L103), [users.controller.ts:123](file:///d:/Sky-Lux-Business/backend/src/modules/users/users.controller.ts#L123)).

---

## 3. Resource × Operation × Role Matrix

| Resource Domain | Operation / Action | Permission Code | `SUPER_ADMIN` | `CEO_ADMIN` | `SALES` | `OPERATOR` | `ACCOUNTANT` |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Organizations** | List all tenants | `@Roles('SUPER_ADMIN')` + `assertSuperAdmin` | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Create new tenant | `@Roles('SUPER_ADMIN')` + `assertSuperAdmin` | ✅ | ❌ | ❌ | ❌ | ❌ |
| | View tenant profile & settings | `organization.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Update tenant settings | `organization.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users & Roles** | View users | `user.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Create user (standard) | `user.create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Create CEO user | `@Roles('SUPER_ADMIN')` | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Lock / Unlock / Delete user | `user.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Manage roles & permissions | `role.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dossiers** | View dossiers (own) | `dossier.view.own` | ✅ | ✅ | ✅ (Own) | ✅ (Own) | ❌ |
| | View dossiers (team) | `dossier.view.team` | ✅ | ✅ | ✅ (Team) | ✅ (Team) | ❌ |
| | View dossiers (all) | `dossier.view.all` | ✅ | ✅ | ❌ | ❌ | ✅ |
| | Create dossier | `dossier.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Update dossier (draft) | `dossier.update` | ✅ | ✅ | ✅ (Own) | ❌ | ❌ |
| | Submit for approval | `dossier.submit` | ✅ | ✅ | ✅ (Own) | ❌ | ❌ |
| | Start review | `dossier.approve` / `OPERATOR` | ✅ | ✅ | ❌ | ✅ | ❌ |
| | Approve / Reject dossier | `dossier.approve` | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Lock dossier | `dossier.lock` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Estimates** | View estimates | `estimate.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Create / Edit estimates | `estimate.create`, `estimate.update` | ✅ | ✅ | ✅ (Draft) | ✅ (Draft) | ❌ |
| **Imports** | Upload & manage Excel | `import.manage` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Documents** | View documents | `document.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Upload / Delete documents | `document.manage` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Customers & CRM** | Manage customer records | `customer.manage` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Suppliers** | Manage supplier records | `supplier.manage` | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Payments & Finance**| View financial summaries | `finance.view` | ✅ | ✅ | ✅ (Own) | ❌ | ✅ |
| | Create receipts / payments | `finance.manage` | ✅ | ✅ | ✅ (Receipts) | ❌ | ✅ (All) |
| | Lock accounting period | `accounting.lock` | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Reports** | View standard reports | `report.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Export reports to Excel | `report.export` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **KPIs** | View personal KPI | `kpi.view` | ✅ | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Own) |
| | View team / all KPIs | `kpi.view.all` | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Set KPI targets | `kpi.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Chat & Messaging** | Realtime chat & SSE | `chat.access` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Audit Logs** | View security audit logs | `audit.view` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 4. Multi-Tenancy & Row-Level Security Enforcement

Sky-Lux CRM uses **Code-Enforced Multi-Tenancy** rather than PostgreSQL database engine RLS policies. The architectural guarantees are enforced as follows:

### 1. Mandatory Organization Scoping in Services
Every domain repository query must filter by `organizationId`:
- **Direct Queries**: `where: { organizationId: user.organizationId, id }`.
- **QueryBuilder Queries**: `.where('entity.organizationId = :organizationId', { organizationId })`.
- *Example*: [dossiers.service.ts:74](file:///d:/Sky-Lux-Business/backend/src/modules/dossiers/dossiers.service.ts#L74) and [customers.service.ts:47](file:///d:/Sky-Lux-Business/backend/src/modules/customers/customers.service.ts#L47).

### 2. Dossier Fine-Grained Row Visibility Matrix ([dossiers.service.ts:76-106](file:///d:/Sky-Lux-Business/backend/src/modules/dossiers/dossiers.service.ts#L76-L106))
If a user does not have `dossier.view.all` or `SUPER_ADMIN`:
```sql
-- Injected visibility filter
WHERE dossier.organizationId = :organizationId
  AND (
    -- Own visibility clause:
    (dossier.salesUserId = :userId OR dossier.operatorUserId = :userId OR dossier.createdBy = :userId)
    -- OR Team visibility clause:
    OR (salesUser.departmentId = :departmentId OR operatorUser.departmentId = :departmentId)
  )
```
If neither permission is possessed, the query injects `AND 1 = 0`, safely returning an empty result set.

### 3. Cross-Tenant ID Leak Resistance
When querying by ID (e.g. `GET /api/dossiers/:id`), services query `WHERE id = :id AND organizationId = :organizationId`. If an attacker supplies a UUID from another organization, the service returns `404 NotFoundException` rather than `403 Forbidden`, ensuring an attacker cannot infer the existence of records belonging to other tenants.
