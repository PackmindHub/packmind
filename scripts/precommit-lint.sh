#!/bin/bash
#
# Verify that the CLI is authenticated against the correct Packmind environment.
# Exits 0 if unauthenticated (allows CI to proceed without a key).
# Exits 1 if authenticated to the wrong org/host.
#

EXPECTED_HOST="https://app.packmind.ai"
EXPECTED_ORG="packmind"
CLI_BINARY="dist/apps/cli/main.cjs"

if [[ ! -f "$CLI_BINARY" ]]; then
  echo "CLI binary not found, building..."
  nx run packmind-cli:build
fi

OUTPUT=$(node "$CLI_BINARY" whoami 2>&1) || exit 0

HOST=$(echo "$OUTPUT" | grep "^Host:" | awk '{print $2}')
ORG=$(echo "$OUTPUT" | grep "^Organization:" | awk '{print $2}')

if [[ "$HOST" != "$EXPECTED_HOST" || "$ORG" != "$EXPECTED_ORG" ]]; then
  echo "ERROR: PACKMIND_API_KEY_V3 is incorrect."
  echo "  Expected host: $EXPECTED_HOST, got: $HOST"
  echo "  Expected org:  $EXPECTED_ORG, got: $ORG"
  exit 1
fi

node "$CLI_BINARY" lint --changed-lines
