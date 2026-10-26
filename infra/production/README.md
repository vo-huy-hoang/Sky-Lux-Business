# Sky-Lux production deployment boundary

This directory contains source for a deployment wrapper that an administrator
must review and install into root-owned locations. Nothing in this directory is
executed with elevated privileges from the repository. Do not install a copy
from `/opt/skylux` while that tree is writable by `ops` unless the source commit
and file hashes have first been independently verified.

## Architecture

```text
GitHub Actions workflow on protected main
  -> GitHub production Environment approval
  -> SSH as ops, forwarding a signed approval ticket and GHCR token on stdin
  -> sudo -n restricted to the root-owned wrapper and one 40-hex SHA
  -> wrapper verifies the ticket, acquires an exclusive lock, and invokes
     root-owned Docker, Compose configuration, and environment configuration
```

The wrapper requires an RSA-3072 SHA-256 signature over these exact bytes:

```text
SKYLUX_PRODUCTION_DEPLOY_V1\n<40-hex-sha>\n<unix-timestamp>\n<run-id>-<run-attempt>
```

The actual message contains line breaks and has no trailing newline. Tickets
expire after five minutes and are rejected if more than one minute in the
future. A root-owned marker prevents replay of a GitHub Actions run id. The
approval private key must be available only as a GitHub **production
Environment** secret to the protected deployment workflow after approval; the
matching public key is installed as `/etc/skylux/deploy-approval.pub`.

The wrapper reads five newline-terminated stdin fields in this order:

1. GHCR login username
2. Short-lived GHCR token
3. Unix ticket timestamp
4. GitHub Actions run id and attempt, such as `12345-1`
5. Base64-encoded RSA signature

No token or signature is printed. Docker login uses a temporary root-only
`DOCKER_CONFIG`, removed on exit. The workflow must not pass credentials as
command-line arguments, write them into `/opt/skylux`, or log the ticket.

The root wrapper never reads code, Compose YAML, helper scripts, or secrets from
`/opt/skylux`. The unprivileged `infra/scripts/deploy.sh` only validates the
SHA/owner and forwards stdin to the fixed wrapper with `sudo -n`.

## Compose identity and data continuity

The protected Compose file uses the existing project name `skylux`. It pins
the resource names that the current Compose file derives from that project:

| Compose resource | Existing effective name | Data path |
| --- | --- | --- |
| `postgres_data` | `skylux_postgres_data` | `/var/lib/postgresql/data` |
| `redis_data` | `skylux_redis_data` | `/data` |
| `skylux_uploads` | `skylux_skylux_uploads` | `/app/uploads` |
| `nextjs_static` | `skylux_nextjs_static` | `/app/.next/static` |
| `skylux` network | `skylux_skylux` | Compose bridge network |

The wrapper passes `--project-name skylux` on every Compose invocation. It only
pulls `frontend` and `backend`, runs migrations with `--no-deps`, and updates
those two services with `up -d --no-deps frontend backend`. It never runs
`down`, prunes resources, or calls `up` for PostgreSQL or Redis.

The frontend container healthcheck is internal to its network namespace and
uses the confirmed `http://127.0.0.1:3000/auth/login` route. The host-side
published endpoint remains `http://127.0.0.1:3002/auth/login`, because the
existing port mapping is `127.0.0.1:3002:3000`. The backend host endpoint is
`http://127.0.0.1:3001/api/health`. Neither port or the aaPanel Nginx config is
changed here.

These names preserve the Compose-derived names for project `skylux`, but the
actual VPS volume/network objects must still be inspected by an administrator
before installing this config. This repository cannot prove what objects the
live Docker daemon currently has.

## Root-owned installation plan

Perform these steps manually after code review, from a trusted checkout whose
commit and hashes are verified. Do not use an installer that is writable by
`ops` as a sudo target.

1. Inspect the current containers, Compose project labels, volumes, network,
   ports, and PostgreSQL mount. Confirm the live objects match the names above.
2. Verify `/usr/bin/docker`, its Compose plugin path, `/usr/bin/openssl`,
   `/usr/bin/curl`, and `/usr/bin/gzip` are root-owned and not writable by
   `ops`, its groups, or other users. The wrapper checks these paths at runtime.
3. Create protected directories and install only reviewed static files:

   ```bash
   install -d -o root -g root -m 0755 /usr/local/lib/skylux-production
   install -d -o root -g root -m 0755 /usr/local/sbin
   install -d -o root -g root -m 0755 /etc/skylux
   install -d -o root -g root -m 0700 /var/lib/skylux-production
   install -d -o root -g root -m 0700 /var/backups/skylux

   install -o root -g root -m 0755 \
     infra/production/skylux-production-deploy \
     /usr/local/sbin/skylux-production-deploy
   install -o root -g root -m 0644 \
     infra/production/docker-compose.prod.root.yml \
     /usr/local/lib/skylux-production/docker-compose.prod.yml
   install -o root -g root -m 0644 \
     infra/production/skylux-production.tmpfiles \
     /etc/tmpfiles.d/skylux-production.conf
   systemd-tmpfiles --create /etc/tmpfiles.d/skylux-production.conf
   ```

4. Create `/etc/skylux/production.env` from the reviewed production settings.
   It must contain exactly one each of `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
   `JWT_SECRET`, and `REGISTRY_OWNER=vo-huy-hoang`. Keep it root-owned with mode
   `0600`. Do not source this file as shell code. The wrapper uses it for Compose
   interpolation and as the backend container's `env_file`.
5. Generate the signing key pair off the VPS using OpenSSL RSA-3072. Keep the
   private key only in the protected GitHub production Environment secret;
   install only the public key as root:root mode `0600` at
   `/etc/skylux/deploy-approval.pub`.

   ```bash
   umask 077
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
     -out deploy-approval-private.pem
   openssl pkey -in deploy-approval-private.pem -pubout \
     -out deploy-approval.pub
   ```

   Add the private PEM contents as the GitHub production Environment secret
   `DEPLOY_APPROVAL_PRIVATE_KEY`, then retain or securely destroy the local
   private-key copy according to the organization's key policy.
   Transfer only the public key to the administrator's trusted installation
   workspace and install it as:

   ```bash
   install -o root -g root -m 0600 \
     deploy-approval.pub /etc/skylux/deploy-approval.pub
   ```
6. Validate the root-owned Compose file using a reviewed full SHA. Review the
   rendered image names, mounts, network, and ports. This is configuration
   validation only; do not run `up` as part of installation.

   ```bash
   APP_VERSION="$TARGET_SHA" docker compose --project-name skylux \
     --env-file /etc/skylux/production.env \
     -f /usr/local/lib/skylux-production/docker-compose.prod.yml config
   ```
7. Add the sudoers fragment only after confirming the wrapper is root-owned and
   the intended `ops` account has no broader sudo or Docker-daemon access that
   would bypass the approval gate:

   ```bash
   install -o root -g root -m 0440 \
     infra/production/skylux-production.sudoers \
     /etc/sudoers.d/skylux-production-deploy
   visudo -cf /etc/sudoers.d/skylux-production-deploy
   sudo -l -U ops
   ```

   The rule matches only the installed wrapper with one 40-hex argument. The
   wrapper independently validates that argument and its signed approval
   ticket. Ubuntu 24.04's sudo version should be checked with `sudo --version`;
   validate the regular-expression argument rule with `visudo` before enabling
   it. Sudoers wildcard arguments are deliberately not used because `*` can
   span spaces and arguments.

## Required follow-up outside this task

The current GitHub Actions workflow is not wired to this protocol. A later
workflow change must:

- require protected `main` and a GitHub `production` Environment with required
  reviewers, prevent self-review, and prevent administrator bypass where the
  repository policy permits;
- build and publish both images before the approved deployment step;
- create the signed ticket only in the approved job, using the Environment
  private-key secret, SHA, timestamp, and `${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}`;
- SSH to `ops` and pipe the five stdin fields to
  `sudo -n /usr/local/sbin/skylux-production-deploy <sha>`;
- remove the current `docker login` performed as `ops`; the wrapper performs
  login through its temporary root-only Docker config.

For a real approval boundary, `ops` must not remain in the `docker` group and
must not retain a password-authenticated sudo grant such as `ops ALL=(ALL)
ALL`. Either restrict `ops` to the wrapper or use a dedicated deploy account
with only this rule; keep a separate administrator account for VPS maintenance.
Otherwise a user who can run arbitrary Docker commands or a root shell can
bypass GitHub approval regardless of this wrapper.

## Runtime behavior and recovery

- A single atomic lock at `/run/skylux-production/active` rejects concurrent
  deployments. A hard kill can leave a stale lock; an administrator must
  verify no deployment is active before clearing it.
- Status is atomically written to `/var/lib/skylux-production/status`, with
  previous and target versions, phase, result, run id, and verified backup
  path. Replay markers are stored in the same protected directory.
- Verified PostgreSQL backups are root-only files under `/var/backups/skylux`.
  Set and monitor a retention/space policy before enabling routine deploys.
- A migration failure may leave partial schema changes. The wrapper never
  restores the database or claims an application rollback is safe; use the
  recorded backup and assess compatibility before manual recovery.
- Failures after migrations leave the state marked `failed` with the relevant
  phase and backup path. A failed healthcheck does not automatically roll back
  application containers.

## Local mock checks

Run `bash infra/production/tests/run-mocks.sh`. It creates a temporary RSA key
pair and fake GHCR token, substitutes protected paths into a temporary wrapper
copy, and mocks Docker and curl. No Production endpoint or real secret is used.
