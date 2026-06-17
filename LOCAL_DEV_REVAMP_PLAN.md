# Local Dev Environment Revamp — Migration Plan

**Status:** Plan only. No files changed yet.
**Goal:** Two commands to a working stack, minimal per-developer install, fast HMR, works on Linux + macOS.
**Date:** 2026-06-17

---

## 1. Problem statement

The current `docker-compose.yml` runs the **watched Node apps** (frontend, api, mcp-server) _inside containers_ over a **bind-mounted source tree** (`.:/packmind`) plus a named `node_modules` volume. This combination is the root of a year of friction:

- **File-system events don't cross the container/VM boundary** (especially on macOS). To compensate, the setup forces polling everywhere: `NX_WATCHER: polling`, `CHOKIDAR_USEPOLLING=1`, `WATCHPACK_POLLING=true`, polling intervals of 200–1000ms. Polling = laggy HMR + constant CPU burn.
- **`node_modules` lives in a named volume** (`dev-node_modules`), invisible to the host, prone to drift, and requiring a dedicated `install-dependencies` container on every boot.
- **The Nx daemon runs in its own container** sharing a socket via the `dev-nx-sock` volume. It's fragile: every app service carries a "Daemon OK / Daemon NOT reachable → fall back" branch that exists _only_ because the design is brittle.

**Insight:** Docker is excellent for **stateful infra** (Postgres, Redis) and bad for **hot-reloading Node processes**. We currently use it for both. Splitting the two removes ~80% of the pain regardless of which toolchain manager we pick.

---

## 2. Chosen approach — Hybrid (infra in Docker, apps native) + `mise`

- **Infra (Postgres, Redis) stays in Docker.** Already pinned by image tag, stateful, Docker's sweet spot. Optionally keep pgAdmin.
- **Apps run natively on the host** via `nx run-many` → real fs events, fast HMR, no daemon/socket/polling.
- **Toolchain pinned by [`mise`](https://mise.jdx.dev)** reading `.nvmrc` (Node 24.15.0) + `package.json` `packageManager` (pnpm 11.5.0 via corepack). Per-dev install = Docker (usually already present) + `mise` (one curl/brew). That is the "minimal install."

### Why this over Nix/devenv

Nix/devenv gives maximal reproducibility (system libs, exact Postgres binary, hermetic CI) but costs team ramp-up. For a pure-JS stack whose infra is already pinned by Docker image tags, mise delivers ~95% of the reproducibility at ~5% of the cost. Nix remains the better choice **only if** hermetic, system-level reproducibility is ranked above onboarding simplicity. See Appendix A for the devenv variant if that priority changes.

### Target developer experience

One-time:

```bash
mise install      # installs pinned Node + pnpm
pnpm install
```

Daily:

```bash
pnpm dev          # infra up (pg+redis) → migrations → nx run-many serve (api, frontend, mcp)
```

---

## 3. Configuration delta: Docker service-names → localhost

Today apps reach each other by Docker **service name**. Running natively, every reference becomes `localhost`. This is the single most error-prone part of the migration.

| Variable                  | Today (in-container)                                  | Native value                                           |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`            | `postgres://postgres:postgres@postgres:5432/packmind` | `postgres://postgres:postgres@localhost:5432/packmind` |
| `REDIS_URI`               | `redis://redis:6379`                                  | `redis://localhost:6379`                               |
| `API_HOSTNAME` (frontend) | `backend`                                             | `localhost`                                            |
| `MCP_HOSTNAME` (frontend) | `mcp-server`                                          | `localhost`                                            |
| `API_PORT` / `MCP_PORT`   | `3000` / `3001`                                       | unchanged                                              |
| `APP_WEB_URL`             | `http://localhost:4200`                               | unchanged                                              |
| `COOKIE_SECURE`           | `false`                                               | unchanged                                              |
| `JS_PLAYGROUND_PATH`      | `packages/linter/js-playground-local`                 | unchanged                                              |

These belong in a committed `.env.example` (and a gitignored `.env`, sourced by the existing `withEnv` script pattern already in `package.json`).

Note: `packages/migrations/datasource.ts` **already** points at `localhost:5432` with `postgres/postgres/packmind` — so native migrations need no new datasource; use `datasource.ts`, not `datasourceDocker.ts`.

---

## 4. Required pre-serve steps (don't lose these)

The current compose entrypoints do two things beyond `nx serve` that must be preserved as explicit setup steps:

1. **tsconfig selection** — `node scripts/select-tsconfig.mjs` (reads `PACKMIND_EDITION`, must be `oss`). Run once after install / on edition change.
2. **JS playground copy** — api and mcp-server copy `packages/linter/js-playground` → `packages/linter/js-playground-local` if absent. Fold into a `predev` / setup script.

---

## 5. Files to add / change

**Add:**

- `mise.toml` — pins `node = "24.15.0"`, enables corepack/pnpm; optional `[env]` to auto-load `.env`.
- `docker-compose.dev.yml` — **infra only**: `postgres` (17-alpine), `redis` (7.2.4), optional `pgadmin`. Named volumes for data. No app services, no nx-daemon, no install-deps, no socket volume, no polling env.
- `.env.example` — the native env values from §3.
- Root `package.json` scripts:
  - `dev:infra` → `docker compose -f docker-compose.dev.yml up -d`
  - `dev:setup` → `node scripts/select-tsconfig.mjs && <js-playground copy>`
  - `migrate` → `cd packages/migrations && pnpm typeorm migration:run -d datasource.ts`
  - `dev` → `pnpm dev:infra && pnpm migrate && nx run-many -t serve -p api frontend mcp-server` (serve targets: `api:serve:development`, `frontend:dev`, `mcp-server:serve:development` — confirm config names during build).
- `CONTRIBUTING.md` (or README dev section) — the two-command flow + troubleshooting.

**Change:**

- `CLAUDE.md` — update the "Local Development Environment" section to describe the hybrid flow.
- Memory note: the recorded start command (`PACKMIND_EDITION=oss docker compose --profile dev up -d`) will be superseded by `pnpm dev`.

**Keep, untouched (transition safety):**

- `docker-compose.yml` (full in-container stack) — leave during transition; delete only after the team validates the hybrid flow.
- `docker-local.sh` + `dockerfile/` — still used for prod-like image builds. Out of scope.

**Eventually delete (phase 4, after validation):** from `docker-compose.yml` — `nx-daemon`, `install-dependencies`, `run-migrations`, `frontend`, `backend`, `mcp-server`, `nginx` services; the `dev-nx-sock`, `dev-node_modules`, `dev-dist`, `dev-tmp`, `dev-corepack-cache`, `dev-pnpm-store` volumes; all `CHOKIDAR_*` / `WATCHPACK_*` / `NX_WATCHER*` / `NX_DAEMON*` env. ~250 lines.

---

## 6. Phased rollout (each phase = its own commit)

1. **Add infra-only compose + mise + .env.example.** Devs can run `docker compose -f docker-compose.dev.yml up -d` and serve apps manually. Old compose still present. _Validation:_ infra healthy, apps serve natively against it.
2. **Add `pnpm dev` orchestration + setup scripts.** Collapse to two commands. _Validation:_ clean clone → `mise install && pnpm install` → `pnpm dev` → frontend at :4200, api at :3000, mcp at :3001, login works.
3. **Docs + CLAUDE.md update.** Team switches over. Gather feedback for ~1 week.
4. **Remove app/daemon services from `docker-compose.yml`** (or delete the file if `docker-local.sh` fully covers prod-like testing). Drop dead env/volumes.

---

## 7. Risks & mitigations

- **Process orchestration / logs.** `nx run-many -t serve` interleaves logs; Ctrl-C should stop all. If output is messy, add a lightweight runner (`mprocs` / `concurrently`) — but try plain `nx run-many` first (zero extra dep).
- **Migration ordering.** `pnpm dev` must run migrations _after_ Postgres is healthy. Add a readiness wait (`pg_isready` loop) or `docker compose ... up -d --wait` (Compose v2 `--wait` blocks until healthy).
- **Port conflicts** with the old full stack. Don't run both compose files at once; `docker-compose.dev.yml` reuses 5432/6379, so `down` the old stack first.
- **macOS native Postgres/Redis not needed** — they stay in Docker, so no host DB install. Bind-mount perf problem is gone because _source_ is no longer mounted into a container.
- **`frontend:dev` vs `frontend:serve` target name.** Compose uses `frontend:dev`; project.json shows `serve`. Verify the exact runnable target when wiring `pnpm dev`.
- **CI parity.** CI currently sets `CI=...` to disable the daemon. CI is unaffected (it builds images / runs e2e via the existing paths). Confirm e2e (`run-e2e-tests` profile) still works against either stack.

---

## 8. Rollback

All Phase 1–3 changes are **additive** (new files + new scripts). If the hybrid flow misbehaves, developers fall back to the untouched `docker-compose.yml` immediately. No destructive change occurs until Phase 4, which is gated on team sign-off.

---

## Appendix A — devenv.sh (Nix) variant

If hermetic reproducibility later outranks onboarding simplicity, swap `mise` + `docker-compose.dev.yml` for a single `devenv.nix`:

- `languages.javascript` + `pnpm` (pinned), `services.postgres` (initial DB `packmind`), `services.redis` — all **native processes**, no Docker daemon at all.
- `processes.{api,frontend,mcp}` with `process-compose` `depends_on` to order migrations first.
- Per-dev install: **Nix only**. Commands: `nix develop` (or `direnv allow`) then `devenv up`.

Trade-off: strongest reproducibility (system libs + exact Postgres binary, identical in CI) at the cost of team Nix ramp-up. Everything else in this plan (the localhost env delta, pre-serve steps, phased rollout, rollback) applies unchanged.
