#!/usr/bin/env bash
#
# Wipes all GitHub App state from the local Packmind database so you can
# re-register and re-install from scratch. Safe to run multiple times.
#
# What it deletes (hard delete — gone forever):
#   - github_app_configs (the singleton App credentials)
#   - git_providers WHERE auth_type = 'github_app'
#   - git_repos connected to those providers
#
# What it leaves alone:
#   - PAT-backed providers and their repos
#   - Everything outside the git domain
#
# Usage:
#   ./scripts/reset-github-app.sh             # asks for confirmation
#   ./scripts/reset-github-app.sh --yes       # skip the prompt

set -euo pipefail

POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-packmind}"

psql_exec() {
  docker compose exec -T "$POSTGRES_SERVICE" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "$1"
}

confirm=${1:-}
if [[ "$confirm" != "--yes" ]]; then
  echo "This will HARD DELETE all GitHub App data from $POSTGRES_DB."
  read -rp "Continue? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

echo "Before:"
echo "  github_app_configs (active): $(psql_exec "SELECT count(*) FROM github_app_configs WHERE deleted_at IS NULL;")"
echo "  App-backed providers (active): $(psql_exec "SELECT count(*) FROM git_providers WHERE auth_type='github_app' AND deleted_at IS NULL;")"
echo "  Repos on App-backed providers: $(psql_exec "SELECT count(*) FROM git_repos WHERE provider_id IN (SELECT id FROM git_providers WHERE auth_type='github_app');")"

docker compose exec -T "$POSTGRES_SERVICE" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM git_repos WHERE provider_id IN (SELECT id FROM git_providers WHERE auth_type = 'github_app');
DELETE FROM git_providers WHERE auth_type = 'github_app';
DELETE FROM github_app_configs;
COMMIT;
SQL

echo "After:"
echo "  github_app_configs: $(psql_exec "SELECT count(*) FROM github_app_configs;")"
echo "  App-backed providers: $(psql_exec "SELECT count(*) FROM git_providers WHERE auth_type='github_app';")"

echo "Done. Refresh the GitHub App settings tab to verify the 'not registered' state."
