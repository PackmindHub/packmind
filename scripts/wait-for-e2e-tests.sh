#!/bin/bash
#
# Wait for the run-e2e-tests container to exit and return its exit code.
# Usage: ./scripts/wait-for-e2e-tests.sh [container_name_pattern]
#
# Default pattern matches docker-compose naming: *run-e2e-tests*

set -e

CONTAINER_PATTERN="${1:-run-e2e-tests}"

echo "[e2e] Waiting for container matching '$CONTAINER_PATTERN' to exit..."

# Wait for the container to exist (it might not have started yet)
MAX_WAIT=120
WAIT_COUNT=0
CONTAINER_NAME=""

while [ -z "$CONTAINER_NAME" ]; do
  CONTAINER_NAME=$(docker ps -a --format '{{.Names}}' | grep "$CONTAINER_PATTERN" | head -1 || true)

  if [ -z "$CONTAINER_NAME" ]; then
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
      echo "[e2e] ERROR: No container matching '$CONTAINER_PATTERN' found within ${MAX_WAIT}s"
      exit 1
    fi
    echo "[e2e] Waiting for container to start... (${WAIT_COUNT}s)"
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
  fi
done

echo "[e2e] Container '$CONTAINER_NAME' found, waiting for it to complete..."

# Wait for the container to exit
docker wait "$CONTAINER_NAME"

# Get the actual exit code from the container
CONTAINER_EXIT_CODE=$(docker inspect "$CONTAINER_NAME" --format='{{.State.ExitCode}}')

echo "[e2e] Container '$CONTAINER_NAME' exited with code: $CONTAINER_EXIT_CODE"

# Copy test results if they exist
if docker cp "$CONTAINER_NAME":/packmind/apps/e2e-tests/playwright-report ./playwright-report 2>/dev/null; then
  echo "[e2e] Test report copied to ./playwright-report"
fi

if docker cp "$CONTAINER_NAME":/packmind/apps/e2e-tests/test-results ./test-results 2>/dev/null; then
  echo "[e2e] Test results copied to ./test-results"
fi

exit "$CONTAINER_EXIT_CODE"
