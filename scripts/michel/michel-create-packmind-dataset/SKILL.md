---
name: michel-create-packmind-dataset
description: Seed a local Packmind instance with a realistic dataset — one organization populated with standards, commands, and skills — so an autonomous agent can exercise its own changes against lifelike data instead of an empty app. Use this whenever you need populated Packmind data to verify a change end-to-end: reproducing a bug that only shows with existing artifacts, recording a UI/CLI demo that needs content on screen, smoke-testing a new endpoint or page against a non-empty playbook, or validating CLI commands (standards list, playbook add/submit) against real records. The artifacts you create are NOT fixed — choose standards, commands, and skills that match what the current task actually needs to test (e.g. seed React/TypeScript standards when testing a standards-list filter; seed a skill when testing the Skills page). Triggers on "seed Packmind data", "create a dataset", "populate the playbook", "set up a test org with standards/commands/skills", "I need data to test this against", or any task that would fail or be meaningless against an empty instance. Defers stack lifecycle to michel-run-local-dev-stack and looks up product behavior through the packmind-user-docs MCP. Prefer this over hand-rolling SQL inserts or clicking through the UI blind.
---

# Create a Packmind dataset

Build a working dataset inside a **local** Packmind instance — an organization with standards, commands, and skills — so a change can be tested against realistic data. Written for an autonomous agent verifying its own work on the Packmind app.

## The one rule that governs what you build

**Let the task pick the artifacts.** This skill is not a fixed recipe that always creates the same three standards. A "dataset" is whatever the thing you are testing needs to be exercised. Before seeding anything, ask: _what must exist for my change to be observable?_

- Testing a standards-list filter or the Standards page → seed a few standards (samples are fastest).
- Testing the Skills page, skill versioning, or `playbook add/submit` → seed at least one skill via the CLI (the only path that creates skills).
- Testing a command palette, `/slug` invocation, or the Commands page → author one or two commands.
- Reproducing a bug that only appears with N artifacts, or a specific name/slug → create exactly those.
- Just need "the app isn't empty" for a demo → a few sample standards + one command + one skill is a well-rounded minimum.

Seed the **minimum** that makes the change observable. Over-seeding slows the run and muddies what you are actually testing. When unsure what an artifact is or how a flow behaves, **look it up in the product docs over MCP** (see below) rather than guessing.

## Product docs are available over MCP

The `packmind-user-docs` MCP server (configured in `.mcp.json`, served from `https://docs.packmind.com/mcp`) exposes Packmind's end-user documentation. Query it whenever you are unsure how a feature works from the user's side — what a standard/command/skill is, what the creation flows offer, what a setting does, how packages/distribution work. This is the authoritative source for product behavior; prefer it to assumptions. The docs describe the UI and concepts; the CLI mechanics below are the seeding path.

## Workflow

### 1. Bring the stack up — defer to `michel-run-local-dev-stack`

That skill is the single source of truth for the lifecycle. The essentials:

```bash
export PACKMIND_EDITION=oss
docker compose --profile dev up -d
until curl -sf localhost:4200 >/dev/null; do sleep 2; done   # frontend ready
curl -s -o /dev/null -w "%{http_code}\n" localhost:4200/api/v0   # API via Vite proxy -> 200
```

**Host-port trap:** the NestJS API is on container port `3000`, which is **not** published to the host. Never poll `localhost:3000`. Reach the API through the frontend's Vite proxy at `http://localhost:4200/api/v0` — and that same base URL (`http://localhost:4200`) is what the CLI must point at.

If the frontend exits on its own or sticks on "Loading Packmind…", that is a known cosmetic flake — restart just `frontend` or reload the page. See `michel-run-local-dev-stack` ("Frontend troubleshooting"); don't debug the app.

**Clean slate:** the Postgres volume persists across `down`, so a prior run leaves its org and artifacts behind. If the test needs a guaranteed-empty start:

```bash
docker compose --profile dev down -v
PACKMIND_EDITION=oss docker compose --profile dev up -d
```

### 2. Create the organization (UI, via Playwright MCP)

A fresh instance has no account; the first org is created through sign-up. Drive the browser with the Playwright MCP:

1. Open `http://localhost:4200` → lands on `/sign-in`.
2. **Sign up** → `/sign-up/create-account`.
3. Work email (e.g. `michel@packmind-demo.com`) → **Continue with email**.
4. Password — must be **8+ chars with at least 2 non-alphanumeric characters** (e.g. `Packmind!Demo#2026`). The signup API rejects anything weaker with a raw error, not a hint, so a weak password reads as a silent failure. Confirm → **Create Account**. (Same policy applies to scripted signup via `POST /api/v0/auth/signup` — see `michel-run-local-dev-stack` → "Creating the first account".)
5. Name the org (e.g. `Packmind Demo`) → **Continue**. Slug is derived (`packmind-demo`).
6. Pick an onboarding reason (_I'm just exploring_) → **Continue**; dismiss the welcome dialog.

You land at `/org/<org-slug>/space/global`. The default space is `Global`.

### 3. Seed standards (only if the task needs them)

**Playbook → Standards.** Fastest path for realistic data is **Browse samples**: tick the languages/frameworks the task needs (e.g. TypeScript, React, Nest.js — click the sample **card**, the checkbox is overlaid by its label) → **Create**. Each becomes a versioned standard (`typescript-best-practices`, etc.), listed immediately.

Other paths when you need specific rules: **Create manually** (`/standards/create`) for authored content, **Browse use cases** to populate from GitHub/Slack/Jira, **Generate from your code** to infer from a codebase. Pick by what you are testing.

### 4. Seed commands (only if the task needs them)

**Playbook → Commands → Create manually** (`/commands/create`).

1. **Name** (e.g. `Create React Component`) → slug auto-derived (`create-react-component`), invoked as `/slug`.
2. **Content**: Markdown prompt. Describe the task precisely; reference your standards when relevant.
3. **Create**.

The page also offers **Browse use cases**, **Create from your code**, and example buttons (_Conventional commit_, _Generate Playwright test_).

### 5. Seed skills — CLI only

Skills are **not** created with a UI form (the Skills page's Import action just documents the CLI flow). A skill is a directory containing a `SKILL.md` with `name`/`description` frontmatter, uploaded via the CLI. Connect the CLI first (§6), then:

```bash
# Stage one skill folder (must contain SKILL.md), targeting a space
node ./dist/apps/cli/main.cjs playbook add <skill-directory> --space global

# Publish. -m skips the interactive editor; --no-review applies it directly
node ./dist/apps/cli/main.cjs playbook submit -m "Add skill (test dataset)" --no-review
```

Output: `1 skill created`. Refresh **Playbook → Skills** to see it, versioned and attributed.

- `playbook add` scans `.claude/skills/**` for `SKILL.md`; point it at a single folder to stage just that one. `playbook status` shows what is tracked.
- Omit `--no-review` to create a **proposal** instead — use this when the task is to test the review workflow.

### 6. Connect the CLI to the local instance

Build from source and run as `node ./dist/apps/cli/main.cjs` — do **not** use a global `packmind-cli`, which may target production.

```bash
npm run packmind-cli:build                                          # -> dist/apps/cli/main.cjs
node ./dist/apps/cli/main.cjs login --host http://localhost:4200    # MUST pass --host; defaults to prod
```

Login starts a callback server (`http://127.0.0.1:19284`) and prints a `/cli-login?...` URL. Open it in a browser session already logged in to the local org (the §2 account); it hands the code back and the CLI stores an API key at `~/.packmind/credentials.json`.

- **Headless / no browser reach:** the `/cli-login` page also shows a one-time code and a `login --host … --code <uuid>` command. Pass `--code` to skip the browser round-trip.

Verify, then the CLI reads/writes the local dataset:

```bash
node ./dist/apps/cli/main.cjs whoami           # Host/Organization/User
node ./dist/apps/cli/main.cjs standards list   # the standards you created
node ./dist/apps/cli/main.cjs spaces list      # -> @global
```

### 7. Tear the stack down when finished

If you are an autonomous agent that started the stack, you **must** take it down before finishing so no container blocks later runs (per `michel-run-local-dev-stack`):

```bash
docker compose --profile dev down        # keeps the dataset
docker compose --profile dev down -v     # also wipes it
```

## Quick reference

```bash
# Stack
export PACKMIND_EDITION=oss
docker compose --profile dev up -d
until curl -sf localhost:4200 >/dev/null; do sleep 2; done
curl -s -o /dev/null -w "%{http_code}\n" localhost:4200/api/v0   # -> 200

# CLI: build + connect to local
npm run packmind-cli:build
node ./dist/apps/cli/main.cjs login --host http://localhost:4200
node ./dist/apps/cli/main.cjs whoami

# Seed a skill (org + standards + commands done in the UI per §2–4)
node ./dist/apps/cli/main.cjs playbook add <skill-dir> --space global
node ./dist/apps/cli/main.cjs playbook submit -m "seed" --no-review

# Teardown (mandatory for autonomous runs)
docker compose --profile dev down
```
