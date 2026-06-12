---
name: michel-run-local-dev-stack
description: The canonical recipe for starting, checking, and stopping the Packmind local dev stack with Docker Compose — the single source of truth other skills and the Michel agent defer to. Covers bringing the full stack (PostgreSQL, Redis, NestJS API, React/Vite frontend on :4200, MCP server, nginx) up in the background, the init services (dependency install + TypeORM migrations) you must wait on, the critical host-port trap that the API on container port 3000 is NOT exposed to the host and must be reached via the frontend Vite proxy at localhost:4200/api/v0, confirming the API and frontend are actually serving before you depend on them, the persistent-volume gotcha that leaves stale Postgres schema and node_modules behind between runs, building the CLI, and tearing everything down so no container is left blocking the run. Use this whenever you need Packmind running locally — to verify a change, record a UI or CLI demo, hit the API, seed data, or reproduce a bug — and whenever you are about to start or stop `docker compose`. If you are an autonomous agent (e.g. Michel) that started the stack, you MUST use the teardown half before finishing. Prefer this over running `nx serve` on the host for anything that needs the real, containerized stack.
---

# Run the Packmind local dev stack

One reliable way to bring Packmind up locally, confirm it's serving, and take it back down. Other skills (`michel-ui-demo-recorder`, `michel-cli-demo-recorder`) and the Michel worker prompt all defer here instead of carrying their own copy — so the lifecycle stays correct in one place.

## What the stack is

Defined by `docker-compose.yml` at the repo root. Every service runs from the base `node:24.15.0-alpine` image with the repo bind-mounted at `/packmind` — there is **no app image to build**. Code runs via `nx serve`/`nx dev` with polling file-watchers, so **source edits hot-reload**; you almost never pass `--build`.

### What is reachable from the host — read this before you `curl` anything

**Only these ports are published to the host:** the **frontend** (`4200` in OSS, **`4201` in proprietary** — see below), `443` (nginx), `5432` (postgres), `6379` (redis), `2345` (pgAdmin). The `backend` and `mcp-server` containers have **no `ports:` mapping** — their ports (`3000` and `3001`) exist only inside the compose network. **`curl localhost:3000` always fails from the host. This is the #1 runtime trap — do not fall into it.**

#### Resolve the frontend host port — never hardcode `4200`

The host-published frontend port **differs by edition**: `4200` for OSS, **`4201` for proprietary** (`docker-compose.yml` maps `4201:4200` there so a proprietary stack can run beside an OSS one without a clash). The **container-internal port is always `4200`** — so the Vite proxy, healthchecks, and e2e (`frontend:4200`) inside the compose network never change. Only the host port does. Ask compose for the real mapping instead of assuming; this is correct for either edition:

```bash
PM_WEB="$(docker compose port frontend 4200 | sed 's#.*:##')"   # → 4200 (oss) or 4201 (proprietary)
```

**Every host-side `curl`/URL below uses `localhost:$PM_WEB`.** Resolve `PM_WEB` once after `up -d` (the container must exist for `port` to report the mapping) and reuse it.

You reach the API and MCP from the host **through the frontend**: the Vite dev server (container port `:4200`) proxies `/api` → `backend:3000` and `/mcp` → `mcp-server:3001` (see `apps/frontend/vite.config.ts`). nginx on `:443` proxies everything to the frontend, so it works through `:443` too.

| Service                      | How to reach it from the host                                      | Notes                                                             |
| ---------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `frontend` (React/Vite)      | `http://localhost:$PM_WEB`                                         | the dev UI (`$PM_WEB` = 4200 oss / 4201 proprietary)              |
| `backend` (NestJS API)       | `http://localhost:$PM_WEB/api/v0` (Vite proxy) — **never** `:3000` | container-internal port is `3000`; API base path is `/api/v0`     |
| `mcp-server`                 | `http://localhost:$PM_WEB/mcp` (Vite proxy) — **never** `:3001`    | container-internal port is `3001`                                 |
| `nginx` (HTTPS, self-signed) | <https://localhost:443>                                            | TLS front for the frontend; `/api` and `/mcp` work through it too |
| `postgres`                   | `localhost:5432`                                                   | `postgres` / `postgres`, db `packmind`                            |
| `redis`                      | `localhost:6379`                                                   | BullMQ + cache                                                    |
| `pgadmin` (`dev` profile)    | <http://localhost:2345>                                            | `admin@pgadmin.com` / `password`                                  |

In short: **from the host, hit the API at `localhost:$PM_WEB/api/v0`, not `localhost:3000`.** Use `localhost:3000` / `backend:3000` only from _inside_ a container on the compose network.

Two **init services** run once on each `up` and then exit — the long-running services wait on them:

- `install-dependencies` — runs `npm install` into the `dev-node_modules` volume. Slow on first boot, skipped on later boots if `package-lock.json` is unchanged.
- `run-migrations` — runs TypeORM migrations against Postgres. `backend` and `mcp-server` will not start until this completes successfully.

`nx-daemon` (in the `dev` profile) speeds up rebuilds. The app services depend on it with `required: false`, so they run with or without it — just slower without.

### The edition variable

`PACKMIND_EDITION` is **resolved from the git remote** — `oss` for the OSS repo, `proprietary` for `packmind-proprietary` (which is OSS + extra packages). Do not hardcode it: export the resolved value once and every compose command (and the matching teardown) inherits it.

```bash
export PACKMIND_EDITION="$(bash scripts/michel/resolve-edition.sh)"
```

The base compose file defaults to `oss` when unset, but the project/container names embed the edition — so `up` and `down` MUST use the same value, and the proprietary repo MUST come up as `proprietary` or its edition-gated packages resolve to OSS stubs.

## Bringing it up

Use the `dev` profile so the nx-daemon (faster rebuilds) and pgAdmin come up too:

```bash
docker compose --profile dev up -d   # background — the usual choice for agents (PACKMIND_EDITION already exported)
docker compose --profile dev up      # foreground — logs stream, Ctrl-C stops
```

Plain `docker compose up -d` (no profile) also works — it skips nx-daemon and pgAdmin and the app services fall back to daemonless serve.

**First boot is slow.** `install-dependencies` does a full `npm install`, then migrations run, then `nx` cold-builds the API and frontend. Watch progress:

```bash
docker compose logs -f backend frontend
```

**`up -d` returns before anything is serving.** Always poll readiness before depending on the stack — and poll the API **through the frontend proxy** (host port `$PM_WEB`), never `:3000` (not host-exposed):

```bash
PM_WEB="$(docker compose port frontend 4200 | sed 's#.*:##')"            # 4200 oss / 4201 proprietary
until curl -sf "localhost:$PM_WEB" >/dev/null; do sleep 1; done          # frontend ready
until curl -sf "localhost:$PM_WEB/api/v0" >/dev/null; do sleep 1; done   # API ready (Vite proxy → backend:3000)
```

Connection-refused = not up yet (still installing/migrating/building). Give first boot several minutes.

**How to wait, for autonomous agents — this has lost real runs:**

- A long bare `sleep` (e.g. `sleep 30 && curl …`) is **blocked by the agent harness**. Wait with a condition-gated loop instead — a short `sleep` _inside_ an `until` loop is allowed: `until curl -sf "localhost:$PM_WEB" >/dev/null; do sleep 2; done`.
- Run that readiness loop **in the foreground and stay in your turn until it completes**. If you run it as a background task and then end your turn "waiting to be notified", a one-shot headless session (e.g. a Michel run via `claude --print`) **terminates at your final message** — the notification never arrives, and whatever you postponed until "the stack is ready" (screenshots, verification, teardown) silently never happens. A real run shipped a PR with zero of its required screenshots exactly this way. Slow cold build = keep looping, not yield.

### Frontend troubleshooting (two real frictions)

The frontend is the flakiest service on first boot. Two failure modes seen in practice:

- **`frontend` exits with `Failed to reconnect to daemon after multiple attempts` (status 1).**
  The `nx-daemon` socket dropped and the `frontend:dev` task — being "continuous" — died with it,
  so the container leaves the `ps` list and `curl localhost:$PM_WEB` refuses. The other services stay
  up. Check with `docker compose ps -a | grep front` (look for `Exited (1)`), then just restart it:

  ```bash
  docker compose --profile dev up -d frontend
  until curl -sf "localhost:$PM_WEB" >/dev/null; do sleep 2; done
  ```

- **Page stuck on "Loading Packmind…", console flooded with `net::ERR_NETWORK_CHANGED`.**
  On a cold Vite start the dev server hands the browser _hundreds_ of unbundled ESM module
  requests; a single network blip mid-load aborts the batch and the SPA never finishes booting.
  It is transient and not a code error. **Just reload the page** once Vite has finished optimizing
  (`docker compose logs frontend` shows `[optimizer] bundling dependencies...` → done). A hard
  reload / re-navigate clears it.

### Re-running migrations

When you add or change a migration, re-run just that init service against the running Postgres:

```bash
docker compose up run-migrations
```

It runs the new migrations and exits. Restart `backend`/`mcp-server` if they need the new schema.

### Starting from a clean database

The `dev-postgres-data` volume **persists across `down`**, so a prior run — including an earlier Michel run on the same issue — leaves rows and applied-migration state behind. The API then returns confusing data during verification even though the current code is correct. For a known-clean state (recording a demo, verifying a schema change, reproducing from scratch), wipe volumes and bring it back up:

```bash
docker compose --profile dev down -v
docker compose --profile dev up -d
```

`-v` drops **all** dev volumes — `dev-postgres-data`, `dev-redis-data`, `dev-node_modules`, `dev-dist`, `dev-tmp`, `dev-nx-sock`, `dev-pgadmin`. The next `up` re-installs dependencies and re-runs every migration from scratch, so it's a full first-boot again (slow). Seed data via the API (`POST` to `/api/v0/...`) after the stack is up — don't record or verify over leftover state.

Plain `docker compose --profile dev down` (no `-v`) is correct when you _want_ existing data — e.g. resuming work where you left off, or avoiding a slow re-install.

## Creating the first account — mind the password policy

A fresh instance has no account; the first user **and** its organization are created by signing up — through the UI (`/sign-up`) or by `POST`ing the signup endpoint. Both paths run the same server-side password check, and that check is the #1 reason an auth-setup script fails on its first run: a too-weak password is **rejected with a raw error, not a friendly hint**, so the script looks like it "silently" did nothing.

The password must be:

- **at least 8 characters**, AND
- **at least 2 non-alphanumeric characters** — anything outside `a-z A-Z 0-9` (`!`, `#`, `@`, `.`, `-`, …).

Enforced in `SignUpWithOrganizationUseCase.validatePassword()`; violations throw `Password must be at least 8 characters` or `Password must contain at least 2 non-alphanumerical characters`. So `Password1` (zero non-alphanumeric chars) is rejected; `Packmind!Demo#2026` (two non-alphanumeric chars, 18 long) passes.

Create the account + org in one call from a script — the signup endpoint is public and the org name is derived from the email:

```bash
curl -s -X POST "localhost:$PM_WEB/api/v0/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"email":"michel@packmind-demo.com","password":"Packmind!Demo#2026","method":"password"}'
```

Driving the full UI sign-up flow (org name, onboarding reason, welcome dialog) is covered by `michel-create-packmind-dataset` §2.

## Building the CLI (when you need the binary, not the server)

The API and frontend need no build step — they serve from source inside the containers. The CLI does:

```bash
npm run packmind-cli:build      # → dist/apps/cli/main.cjs
```

Run the built CLI with `node ./dist/apps/cli/main.cjs` (per the project CLAUDE.md). **Build it before demoing it** — a demo of stale `dist/` proves nothing about your change. The CLI talks to a Packmind API, so start the stack first if you want it to hit your local backend.

## Taking it down

```bash
docker compose --profile dev down       # stop + remove containers; volumes PRESERVED
docker compose --profile dev down -v    # ALSO drop all dev volumes (data + schema + node_modules)
```

Pass `--profile dev` so the nx-daemon and pgAdmin containers are removed too.

**If you started the stack, tear it down before you finish — this is not optional for autonomous agents.** A lingering compose stack (and any host-side `nx serve`, or open Playwright/chrome-devtools MCP browser session) leaves containers running that block the run from completing. `docker compose --profile dev down` after your verification/recording is the close-out step, every time.

Use `down` (volumes preserved) by default. Reach for `down -v` only when you specifically want the next `up` to start from an empty database and a fresh install.

## Quick reference

| Goal                            | Command                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Resolve + export the edition    | `export PACKMIND_EDITION="$(bash scripts/michel/resolve-edition.sh)"`                          |
| Start in background             | `docker compose --profile dev up -d`                                                           |
| Watch boot logs                 | `docker compose logs -f backend frontend`                                                      |
| Resolve the frontend host port  | `PM_WEB="$(docker compose port frontend 4200 \| sed 's#.*:##')"` (4200 oss / 4201 proprietary) |
| Confirm frontend serving        | `until curl -sf "localhost:$PM_WEB" >/dev/null; do sleep 1; done`                              |
| Confirm API serving (via proxy) | `until curl -sf "localhost:$PM_WEB/api/v0" >/dev/null; do sleep 1; done`                       |
| Re-run migrations               | `docker compose up run-migrations`                                                             |
| Build the CLI                   | `npm run packmind-cli:build`                                                                   |
| Stop (keep data)                | `docker compose --profile dev down`                                                            |
| Stop + wipe all volumes         | `docker compose --profile dev down -v`                                                         |

## Gotchas, condensed

- **`export PACKMIND_EDITION="$(bash scripts/michel/resolve-edition.sh)"`** — resolve it from the git remote once, before any compose command. Never hardcode `oss`; the proprietary repo must come up as `proprietary`, and `up`/`down` must agree.
- **Frontend host port is edition-dependent — never hardcode `4200`.** `4200` (OSS) vs **`4201` (proprietary)**; container-internal is always `4200`. Resolve it once: `PM_WEB="$(docker compose port frontend 4200 | sed 's#.*:##')"`, then use `localhost:$PM_WEB`. A run probing `:4200` on proprietary waits on a port nothing serves.
- **Port 3000 is NOT exposed to the host.** `curl localhost:3000` always refuses the connection — the `backend` container has no `ports:` mapping. From the host, reach the API at **`localhost:$PM_WEB/api/v0`** (Vite proxy) or via nginx `https://localhost:443`. Likewise the MCP server is only at `localhost:$PM_WEB/mcp`, never `localhost:3001`. Use `:3000`/`:3001` only from inside a container on the compose network.
- **`up -d` ≠ ready.** Poll `:$PM_WEB` (frontend) and `:$PM_WEB/api/v0` (API via proxy) before depending on the stack. First boot takes minutes (install + migrate + cold build).
- **Wait in the foreground, inside your turn.** Bare long `sleep`s are harness-blocked; use `until curl -sf …; do sleep 2; done` and stay in the loop until it exits. Never end your turn expecting a background readiness task to wake you — in a one-shot headless session it won't, and everything you postponed is lost. See "How to wait" above.
- **No app image build.** Source is bind-mounted and hot-reloads; `--build` is almost never needed. Don't reach for it the way you would on an image-based stack.
- **`dev-postgres-data` outlives `down`.** Stale rows and applied-migration state from a prior run cause phantom data during verification. `down -v` for a true clean slate (and a slow re-boot).
- **`dev-node_modules` is a volume too.** Dependency changes are picked up by re-running `install-dependencies` (re-`up`); a `down -v` forces a full reinstall.
- **MCP server has no host port.** It's reachable only from inside the compose network (e.g. by the frontend), not from your host via `localhost`.
- **Frontend can die on its own after a clean boot.** `Failed to reconnect to daemon` kills the continuous `frontend:dev` task → container `Exited (1)`, `localhost:$PM_WEB` refuses. Restart just that service: `docker compose --profile dev up -d frontend`.
- **"Loading Packmind…" forever + `ERR_NETWORK_CHANGED` spam = transient cold-Vite hiccup, not a bug.** Reload the page after the optimizer finishes bundling. Don't go debugging the app.
- **The API base is `/api/v0`**, not `/api`. Health check and all calls hang off that prefix.
- **Sign-up password policy is enforced server-side.** The signup API rejects any password under 8 chars or with fewer than 2 non-alphanumeric chars — with a raw error, not a hint, so a weak password looks like a silent failure. Use one like `Packmind!Demo#2026`. See "Creating the first account".
- **Never leave it running.** If you brought it up, `docker compose --profile dev down` before finishing — lingering containers block completion.
