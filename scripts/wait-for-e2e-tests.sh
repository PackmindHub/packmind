#!/bin/bash
#
# Wait for the run-e2e-tests container to exit and return its exit code.
# Usage: ./scripts/wait-for-e2e-tests.sh [container_name_pattern]
#
# Default pattern matches docker-compose naming: *run-e2e-tests*

set -e

CONTAINER_PATTERN="${1:-run-e2e-tests}"

echo "[e2e] Waiting for container matching '$CONTAINER_PATTERN' to complete..."

# Wait for the container to exist (it might not have been created yet)
MAX_WAIT=300
WAIT_COUNT=0
CONTAINER_NAME=""

while [ -z "$CONTAINER_NAME" ]; do
  CONTAINER_NAME=$(docker ps -a --format '{{.Names}}' | grep "$CONTAINER_PATTERN" | head -1 || true)

  if [ -z "$CONTAINER_NAME" ]; then
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
      echo "[e2e] ERROR: No container matching '$CONTAINER_PATTERN' found within ${MAX_WAIT}s"
      exit 1
    fi
    echo "[e2e] Waiting for container to be created... (${WAIT_COUNT}s)"
    sleep 5
    WAIT_COUNT=$((WAIT_COUNT + 5))
  fi
done

echo "[e2e] Container '$CONTAINER_NAME' found"

# Wait for the container to start running (it might be waiting for dependencies)
echo "[e2e] Waiting for container to start running..."
WAIT_COUNT=0
while true; do
  STATUS=$(docker inspect "$CONTAINER_NAME" --format='{{.State.Status}}' 2>/dev/null || echo "unknown")

  case "$STATUS" in
    "running")
      echo "[e2e] Container is running, waiting for it to complete..."
      break
      ;;
    "exited"|"dead")
      echo "[e2e] Container has already exited with status: $STATUS"
      break
      ;;
    "created"|"waiting")
      if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "[e2e] ERROR: Container stuck in '$STATUS' state for ${MAX_WAIT}s"
        echo "[e2e] Dumping container logs:"
        docker logs "$CONTAINER_NAME" 2>&1 || true
        echo "[e2e] Dumping docker-compose logs:"
        docker compose logs --tail=50 2>&1 || true
        exit 1
      fi
      echo "[e2e] Container status: $STATUS (waiting for dependencies)... (${WAIT_COUNT}s)"
      sleep 5
      WAIT_COUNT=$((WAIT_COUNT + 5))
      ;;
    *)
      echo "[e2e] Container status: $STATUS... (${WAIT_COUNT}s)"
      sleep 5
      WAIT_COUNT=$((WAIT_COUNT + 5))
      ;;
  esac
done

# Wait for the container to exit (if still running)
STATUS=$(docker inspect "$CONTAINER_NAME" --format='{{.State.Status}}' 2>/dev/null || echo "unknown")
if [ "$STATUS" = "running" ]; then
  echo "[e2e] Waiting for container to exit..."
  docker wait "$CONTAINER_NAME" || true
fi

# Get the actual exit code from the container
CONTAINER_EXIT_CODE=$(docker inspect "$CONTAINER_NAME" --format='{{.State.ExitCode}}')

echo "[e2e] Container '$CONTAINER_NAME' exited with code: $CONTAINER_EXIT_CODE"

# Show container logs
echo "[e2e] Container logs:"
docker logs "$CONTAINER_NAME" 2>&1 | tail -100

# Copy test results if they exist
if docker cp "$CONTAINER_NAME":/packmind/apps/e2e-tests/playwright-report ./playwright-report 2>/dev/null; then
  echo "[e2e] Test report copied to ./playwright-report"
fi

if docker cp "$CONTAINER_NAME":/packmind/apps/e2e-tests/test-results ./test-results 2>/dev/null; then
  echo "[e2e] Test results copied to ./test-results"
fi

exit "$CONTAINER_EXIT_CODE"
