#!/bin/bash
# Log learning to .claude/learning.yaml
# Usage: log-learning.sh "<summary>"

set -e

SUMMARY="$1"

if [ -z "$SUMMARY" ]; then
  echo "Usage: log-learning.sh <summary>"
  echo "  summary: Concise description of what was learned"
  exit 1
fi

# Find project root (look for .claude directory)
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -d "$PROJECT_ROOT/.claude" ]; then
    break
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

if [ "$PROJECT_ROOT" = "/" ]; then
  echo "Error: Could not find .claude directory"
  exit 1
fi

LEARNING_FILE="$PROJECT_ROOT/.claude/learning.yaml"
TIMESTAMP=$(date -Iseconds)

# Create file if missing
if [ ! -f "$LEARNING_FILE" ]; then
  touch "$LEARNING_FILE"
fi

# Append entry
cat >> "$LEARNING_FILE" << EOF
- date: "$TIMESTAMP"
  summary: "$SUMMARY"
EOF

echo "Logged learning: $SUMMARY"
