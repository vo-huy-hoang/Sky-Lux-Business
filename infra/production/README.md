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
  -> SSH as the dedicated, unprivileged skylux-deploy account
  -> `sudo -n` permits only the root-owned wrapper and one 40-hex SHA
  -> wrapper verifies the ticket, acquires an exclusive lock, and invokes
     root-owned Docker, Compose configuration, and environment configuration
```

The `skylux-deploy` account must not belong to `sudo` or `docker`, and must not
be able to modify the wrapper, Compose file, production environment, approval
key, or their parent directories. Keep `ops` as the existing administrator
account; this plan does not change its current privileges. Install the GitHub
Actions SSH public key only in `skylux-deploy`'s `authorized_keys`, using a
dedicated key pair and the `restrict` authorized-key option. Do not install
that key for `ops` or another account. The sudoers rule below grants
`skylux-deploy` only the root-owned wrapper with one 40-character hexadecimal
argument; wrapper validation and the signed ticket are independent checks.

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

### GitHub `production` Environment

The current Environment configuration is:

- Required reviewers: enabled; reviewer `vo-huy-hoang`.
- Prevent self-review: off. The administrator currently approves Production
  deployments personally as an intentional operating choice.
- Administrator bypass: off.
- Deployment branches and tags: selected refs, with `main` as the only allowed
  branch and no allowed tags.
- Wait timer: off.

If more release owners join the project, enable prevention of self-review to
increase separation of duties. GitHub approval does not replace the VPS-side
RSA signature verification; the wrapper independently rejects unsigned,
invalid, expired, or replayed tickets.

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

The frontend container healthcheck uses `http://127.0.0.1:3000/login`; its
Node fetch client disables redirect following and accepts only HTTP 200. The
host-side endpoint is `http://127.0.0.1:3002/login`. The wrapper checks exact
HTTP 200 for that endpoint and `http://127.0.0.1:3001/api/health`, without
following redirects. Docker healthchecks are also required for both app
containers. The `/login` route is implemented by `frontend/app/login/page.tsx`;
`/auth/login` redirects to it. Ports and aaPanel Nginx are unchanged.

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
3. Create the dedicated account and verify it has no privileged groups. Keep
   `ops` as the existing administrator; do not use `ops` for GitHub Actions.
   These commands are an administrator's installation plan only and have not
   been run on the VPS:

   ```bash
   sudo useradd --create-home --shell /bin/bash skylux-deploy
   id skylux-deploy
   getent group sudo docker
   ```

   Confirm `skylux-deploy` is absent from both `sudo` and `docker` group member
   lists. Add a dedicated GitHub Actions SSH public key to
   `/home/skylux-deploy/.ssh/authorized_keys` with the `restrict` option; keep
   the matching private key only in the GitHub Environment `production` and
   configure SSH to connect as `skylux-deploy`. Do not reuse `ops`'s key.
   Set the SSH directory to owner `skylux-deploy:skylux-deploy`, mode `0700`,
   and `authorized_keys` to the same owner, mode `0600`. Prefix its one key
   line with `restrict`. Verify public-key SSH login works for this user, then
   lock password authentication with `sudo passwd --lock skylux-deploy` and
   verify key login again before relying on the account.
4. Create protected directories and install only reviewed static files:

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

5. Create `/etc/skylux/production.env` from the reviewed production settings.
   It must contain exactly one each of `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
   `JWT_SECRET`, and `REGISTRY_OWNER=vo-huy-hoang`. Keep it root-owned with mode
   `0600`. Do not source this file as shell code. The wrapper uses it for Compose
   interpolation and as the backend container's `env_file`.
6. Generate the signing key pair off the VPS using OpenSSL RSA-3072. Keep the
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
7. Validate the root-owned Compose file using a reviewed full SHA. Review the
   rendered image names, mounts, network, and ports. This is configuration
   validation only; do not run `up` as part of installation.

   ```bash
   APP_VERSION="$TARGET_SHA" docker compose --project-name skylux \
     --env-file /etc/skylux/production.env \
     -f /usr/local/lib/skylux-production/docker-compose.prod.yml config
   ```
8. Add the sudoers fragment only after confirming the wrapper is root-owned and
   `skylux-deploy` has no broader sudo or Docker-daemon access that would bypass
   the approval gate:

   ```bash
   install -o root -g root -m 0440 \
     infra/production/skylux-production.sudoers \
     /etc/sudoers.d/skylux-production-deploy
   visudo -cf /etc/sudoers.d/skylux-production-deploy
   sudo -l -U skylux-deploy
   ```

   The rule names only `skylux-deploy` and matches the installed wrapper with
   one 40-hex argument. The wrapper independently validates that argument and
   its signed approval ticket. Ubuntu 24.04's sudo version should be checked
   with `sudo --version`;
   validate the regular-expression argument rule with `visudo` before enabling
   it. Sudoers wildcard arguments are deliberately not used because `*` can
   span spaces and arguments.

## GitHub Actions production deployment

`.github/workflows/build-images.yml` runs the protected `production`
Environment deployment after both test jobs and `build-and-push` succeed on
`main`. The deployment job has a separate concurrency group and does not cancel
an in-progress deployment. It checks that the built 40-character commit SHA is
still the current remote `main` HEAD before creating a ticket. Images use that
SHA as their tag; `latest` is never used and images are not rebuilt in the
deployment job.

After Environment approval, the job creates the RSA-3072/SHA-256 ticket and
passes exactly five newline-terminated fields to the restricted wrapper over
OpenSSH. SSH verifies the configured `VPS_SSH_KNOWN_HOSTS` file with strict
host-key checking and uses private temporary files with mode `0600`. The
workflow's `GITHUB_TOKEN` is granted only `contents: read` and `packages: read`
in this job. The GHCR packages must grant this repository read access:

- `ghcr.io/vo-huy-hoang/skylux-frontend`
- `ghcr.io/vo-huy-hoang/skylux-backend`

Package access is configured in GitHub's package settings and cannot be
confirmed from this repository checkout. Verify both packages explicitly
before the first deployment. If either package is not linked to this repository
or does not grant it access, add this repository under that package's
**Settings → Manage Actions access** with **Read** permission. Do not create a
broad-scope PAT to work around package access.

`.github/workflows/deploy.yml` remains a disabled manual notification that
fails without building, connecting over SSH, or deploying. The root-owned
wrapper remains the only production deployment implementation; the workflow
does not copy Compose configuration or invoke Docker on the VPS.

The GitHub `production` Environment must have required reviewers, administrator
bypass disabled, and deployment refs limited to `main` (the current self-review
setting remains off by design). The VPS still needs the reviewed one-time
installation and validation described above before any first deployment.

The existing `ops` account retains its administrative access and must not be
used by GitHub Actions. Protect its credentials as an administrator account.
The dedicated `skylux-deploy` account must have no Docker-daemon access or
broader sudo rights; otherwise a user could bypass the GitHub approval gate.

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
