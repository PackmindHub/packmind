#!/usr/bin/env bash
# Serve the three apps natively (api, mcp-server, frontend) against the infra
# from docker-compose.dev.yml. Run by `pnpm dev`.
#
# Wiring strategy: the local-dev connection values are deterministic (apps run
# natively → everything is localhost) and are NOT secrets, so they are baked in
# here as defaults. An optional `.env` is sourced FIRST, so any value a developer
# sets there takes precedence (e.g. point DATABASE_URL at a different port).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# 1) developer overrides / secrets (optional)
[ -f .env ] && . ./.env
# 2) deterministic local-dev defaults — only applied when not already set above
: "${PACKMIND_EDITION:=oss}"
: "${DATABASE_URL:=postgres://postgres:postgres@localhost:5432/packmind}"
: "${REDIS_URI:=redis://localhost:6379}"
: "${API_HOSTNAME:=localhost}"
: "${API_PORT:=3000}"
: "${MCP_HOSTNAME:=localhost}"
: "${MCP_PORT:=3001}"
: "${APP_WEB_URL:=http://localhost:4200}"
: "${COOKIE_SECURE:=false}"
: "${JS_PLAYGROUND_PATH:=packages/linter/js-playground-local}"
set +a

exec ./node_modules/.bin/nx run-many -t serve -p api mcp-server frontend
