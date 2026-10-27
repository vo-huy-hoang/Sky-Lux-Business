# Production admin bootstrap

This CLI creates the first `SKYLUX` organization when absent, the shared permission catalog, the `SUPER_ADMIN` role, and one active admin user. It is independent of the demo seed and is never run by application startup, migrations, CI, or Auto Deploy. It does not apply migrations or write organization settings. Organization currency and timezone are already represented by the organization columns; current backend code does not consume the settings seeded by the demo seed.

## Preconditions

- Run the published Backend image on the Production Docker network with its Production `.env` file.
- Confirm PostgreSQL 16 is healthy and every migration included in the image has already been applied.
- Confirm the database snapshot is otherwise in the expected first-bootstrap state. Existing incompatible organization, duplicate email, user/role conflict, or unsupported schema makes the command stop without changes.
- Create and verify a recoverable PostgreSQL backup before `--apply`.
- Run from an interactive terminal. Email and name are prompted; the password is entered twice without terminal echo, must be at least 14 characters with uppercase, lowercase, digit and symbol, and is stored only as bcrypt (12 rounds).

## Dry-run

From the deployment directory that contains the production Compose file and `.env`:

```sh
docker compose -f docker-compose.prod.yml run --rm --no-deps backend node dist/database/bootstrap/cli.js --dry-run
```

The command checks the database connection, PostgreSQL version, migrations, required schema, organization/email/role conflicts, and employee code, then prints the planned counts. It holds a transaction-scoped advisory lock and performs reads only.

## Apply after review

Review the dry-run result and confirm the backup independently. Then run:

```sh
docker compose -f docker-compose.prod.yml run --rm --no-deps backend node dist/database/bootstrap/cli.js --apply --confirm-production --confirm-backup
```

The command asks the operator to type `PRODUCTION` and `BACKUP VERIFIED`, then prompts for the admin details. All writes use one PostgreSQL transaction and a transaction advisory lock. Re-running after a successful bootstrap reports the existing Super Admin and does not change its password or create another account.

After a successful apply, use read-only SQL to confirm the organization, admin, role, permission assignments and bcrypt hash prefix. Then log in to the CRM and verify access. This document is an operator procedure only; the CLI must not be invoked from CI or automated deployment.

## Test database

Integration specs only run when `BOOTSTRAP_TEST_DATABASE_URL` points to a dedicated PostgreSQL database whose name contains `test` or `testing`. They apply migrations to that test database and truncate its bootstrap tables between cases. Never point this variable at Production.
