#!/bin/bash
#
# Wait for the run-e2e-tests container to exit and return its exit code.
# Usage: ./scripts/wait-for-e2e-tests.sh [container_name_pattern]
#
# Default pattern matches docker-compose naming: *run-e2e-tests*

set -e

CONTAINER_PATTERN="${1:-run-e2e-tests}"

echo "[e2e] =========================================="
echo "[e2e] Waiting for E2E tests to complete"
echo "[e2e] Container pattern: $CONTAINER_PATTERN"
echo "[e2e] COMPOSE_PROJECT_NAME: ${COMPOSE_PROJECT_NAME:-not set}"
echo "[e2e] PACKMIND_EDITION: ${PACKMIND_EDITION:-not set}"
echo "[e2e] =========================================="

# Show initial state
echo "[e2e] All container names:"
docker ps -a --format '{{.Names}}' | sort

echo "[e2e] Docker compose services (e2e profile):"
docker compose --profile=e2e ps -a 2>/dev/null || echo "[e2e] docker compose ps failed"

echo "[e2e] Searching for pattern: $CONTAINER_PATTERN"
echo "[e2e] Matching containers:"
docker ps -a --format '{{.Names}}' | grep "$CONTAINER_PATTERN" || echo "[e2e] No matches found yet"

# Wait for the container to exist (it might not have been created yet)
MAX_WAIT=300
WAIT_COUNT=0
CONTAINER_NAME=""

while [ -z "$CONTAINER_NAME" ]; do
  CONTAINER_NAME=$(docker ps -a --format '{{.Names}}' | grep "$CONTAINER_PATTERN" | head -1 || true)

  if [ -z "$CONTAINER_NAME" ]; then
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
      echo "[e2e] ERROR: No container matching '$CONTAINER_PATTERN' found within ${MAX_WAIT}s"
      echo "[e2e] All containers:"
      docker ps -a --format 'table {{.Names}}\t{{.Status}}'
      exit 1
    fi
    echo "[e2e] Waiting for container to be created... (${WAIT_COUNT}s)"

    # Show docker-compose status every 30 seconds
    if [ $((WAIT_COUNT % 30)) -eq 0 ] && [ $WAIT_COUNT -gt 0 ]; then
      echo "[e2e] Docker compose status:"
      docker compose ps 2>/dev/null || true
    fi

    sleep 5
    WAIT_COUNT=$((WAIT_COUNT + 5))
  fi
done

echo "[e2e] Container '$CONTAINER_NAME' found"

# Wait for the container to start running or exit
echo "[e2e] Monitoring container status..."
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
    "created")
      if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "[e2e] ERROR: Container stuck in '$STATUS' state for ${MAX_WAIT}s"
        echo "[e2e] Container is waiting for dependencies. Docker compose status:"
        docker compose ps 2>/dev/null || true
        echo "[e2e] Docker compose logs (last 100 lines):"
        docker compose logs --tail=100 2>&1 || true
        exit 1
      fi
      echo "[e2e] Container status: $STATUS (waiting for dependencies)... (${WAIT_COUNT}s)"

      # Show detailed status every 30 seconds
      if [ $((WAIT_COUNT % 30)) -eq 0 ] && [ $WAIT_COUNT -gt 0 ]; then
        echo "[e2e] Docker compose status:"
        docker compose ps 2>/dev/null || true
      fi

      sleep 5
      WAIT_COUNT=$((WAIT_COUNT + 5))
      ;;
    *)
      echo "[e2e] Container status: $STATUS... (${WAIT_COUNT}s)"
      sleep 5
      WAIT_COUNT=$((WAIT_COUNT + 5))

      if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "[e2e] ERROR: Timeout waiting for container, current status: $STATUS"
        docker compose ps 2>/dev/null || true
        exit 1
      fi
      ;;
  esac
done

# Wait for the container to exit (if still running)
STATUS=$(docker inspect "$CONTAINER_NAME" --format='{{.State.Status}}' 2>/dev/null || echo "unknown")
if [ "$STATUS" = "running" ]; then
  echo "[e2e] Container is running, waiting for exit..."
  docker wait "$CONTAINER_NAME" || true
fi

# Get the actual exit code from the container
CONTAINER_EXIT_CODE=$(docker inspect "$CONTAINER_NAME" --format='{{.State.ExitCode}}')

echo "[e2e] =========================================="
echo "[e2e] Container '$CONTAINER_NAME' exited with code: $CONTAINER_EXIT_CODE"
echo "[e2e] =========================================="

# Show container logs
echo "[e2e] Container logs:"
docker logs "$CONTAINER_NAME" 2>&1 | tail -200

# Copy test results if they exist
if docker cp "$CONTAINER_NAME":/packmind/apps/e2e-tests/playwright-report ./playwright-report 2>/dev/null; then
  echo "[e2e] Test report copied to ./playwright-report"
fi

if docker cp "$CONTAINER_NAME":/packmind/apps/e2e-tests/test-results ./test-results 2>/dev/null; then
  echo "[e2e] Test results copied to ./test-results"
fi

exit "$CONTAINER_EXIT_CODE"
