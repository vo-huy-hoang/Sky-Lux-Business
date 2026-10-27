# Production admin bootstrap

This is a one-time operator procedure for creating the first `SKYLUX` organization, shared permission catalog, `SUPER_ADMIN` role, and active admin user. It does not run at application startup, through migrations, or as part of Auto Deploy. It does not apply migrations or write organization settings.

## Production deployment identity

Use only the verified Production deployment configuration:

- Compose file: `/usr/local/lib/skylux-production/docker-compose.prod.yml`
- Environment file: `/etc/skylux/production.env`
- Docker Compose project: `skylux`
- Running backend container: `skylux-backend-1`
- Compose service: `backend`; database service: `postgres`

Do not run from the repository checkout or use its `docker-compose.yml` / `docker-compose.prod.yml`. Do not use a local database, another Compose project, a floating `latest` image, or a backend container from another project.

Set the paths for commands in the current shell and ensure the env file is readable only by authorized operators:

```sh
COMPOSE=/usr/local/lib/skylux-production/docker-compose.prod.yml
ENV_FILE=/etc/skylux/production.env
PROJECT=skylux
```

Before proceeding, check the project and rendered configuration without printing the environment file or rendered secrets:

```sh
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" config --quiet
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" ps
docker inspect --format 'name={{.Name}} image={{.Config.Image}} image_id={{.Image}}' skylux-backend-1
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" images backend
```

Confirm `skylux-backend-1` is the running backend for project `skylux`, and compare its image reference and image ID with the approved release and the image selected by this Compose configuration. The repository release workflow tags backend images as `ghcr.io/vo-huy-hoang/skylux-backend:<commit-sha>`; identify and verify the exact approved SHA from the deployment record. Stop if the image is missing, differs from the approved release, or the Compose config resolves to an unexpected value. Do not pull or recreate application containers as part of this procedure.

## Preconditions

- Confirm the Production database service is healthy and is PostgreSQL 16. Check the migration table read-only and confirm every migration included in the approved backend image has already been applied. This CLI intentionally refuses to run with pending migrations.
- Check database status read-only before the backup and bootstrap. Confirm the `SKYLUX` first-bootstrap state is expected. The CLI refuses incompatible organization data, an existing user/role in a partial first-bootstrap state, duplicate email, invalid permission assignments, or unsupported schema before writing.
- Create a PostgreSQL backup and verify that the output is non-empty and readable before `--apply`. Store it in the approved protected backup location, outside the database container volume.
- Run only from an authorized interactive terminal. `--apply` requires a TTY. Email and name are prompted; `--dry-run` does not request a password. `--apply` prompts for the password twice without terminal echo. It must be at least 14 characters with uppercase, lowercase, digit, and symbol, and is stored only as bcrypt (12 rounds).

Example read-only checks, scoped to the verified Compose project:

```sh
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version(); SELECT count(*) AS applied_migrations FROM migrations;"'
```

Compare the migration count and names to the migrations packaged in the approved image. The count alone is not sufficient if the release contains a different migration set.

For backup, use the site's approved secure destination and retention process. The following illustrates a custom-format dump streamed from the verified `postgres` service; replace the destination with the authorized backup path and verify the resulting artifact before applying:

```sh
BACKUP_FILE=/approved/secure/backup/path/skylux-before-admin-bootstrap.dump
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" >/dev/null
```

## Dry-run

Run the CLI from the verified Compose configuration and approved backend image. `--pull never` prevents Compose from silently substituting a newly pulled image; if the installed Compose version does not support it, stop and use the site's approved method to pin and verify the image before continuing.

```sh
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" run --pull never --rm --no-deps backend node dist/database/bootstrap/cli.js --dry-run
```

The command checks the database connection, PostgreSQL version, migrations, required schema and indexes, organization/user/role/permission-assignment conflicts, and employee code. It takes a transaction-scoped advisory lock, rolls back its transaction, and performs no data writes. Review the output and resolve any rejected precondition; do not manually seed around a refusal.

## Apply after review

After confirming the approved image, database state, applied migrations, dry-run output, and verified backup, run from the same project and configuration:

```sh
docker compose --project-name "$PROJECT" --file "$COMPOSE" --env-file "$ENV_FILE" run --pull never --rm --no-deps backend node dist/database/bootstrap/cli.js --apply --confirm-production --confirm-backup
```

The command requires `PRODUCTION` and `BACKUP VERIFIED`, then securely prompts for the admin credentials. All writes use one PostgreSQL transaction and a transaction advisory lock. A complete prior bootstrap is an idempotent no-op; an incomplete or conflicting organization state stops before writes. Do not run this command from CI or as part of a deployment. Do not edit Production through `synchronize`, manual SQL, or a demo seed.

After success, use read-only SQL against the same verified database to confirm the organization, admin, role, permission assignments, and bcrypt hash format. Then verify login and access through the CRM. Keep the backup according to the approved retention policy.

## PostgreSQL integration tests

The integration suites require local PostgreSQL test databases named exactly `skylux_bootstrap_test` and `skylux_role_unique_test`, on loopback only. The bootstrap suite uses `TRUNCATE ... CASCADE`; its guard rejects every other database name, non-local host, and `NODE_ENV=production`. In CI, missing integration URLs fail the test job instead of skipping the suites. Never set these variables to Production credentials or hosts.
