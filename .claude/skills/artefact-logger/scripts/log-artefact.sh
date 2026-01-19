#!/bin/bash
# Log artefact access to .claude/artefacts.yaml
# Usage: log-artefact.sh "<name>" "<path>" "<type>"

set -e

NAME="$1"
PATH_ARG="$2"
TYPE="$3"

if [ -z "$NAME" ] || [ -z "$PATH_ARG" ] || [ -z "$TYPE" ]; then
  echo "Usage: log-artefact.sh <name> <path> <type>"
  echo "  type: claude_md | rule | skill | command | agent"
  exit 1
fi

# Validate type
case "$TYPE" in
  claude_md|rule|skill|command|agent) ;;
  *)
    echo "Error: Invalid type '$TYPE'"
    echo "  Valid types: claude_md | rule | skill | command | agent"
    exit 1
    ;;
esac

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

ARTEFACTS_FILE="$PROJECT_ROOT/.claude/artefacts.yaml"
TIMESTAMP=$(date -Iseconds)

# Create file if missing
if [ ! -f "$ARTEFACTS_FILE" ]; then
  touch "$ARTEFACTS_FILE"
fi

# Append entry
cat >> "$ARTEFACTS_FILE" << EOF
- name: $NAME
  path: $PATH_ARG
  type: $TYPE
  date: $TIMESTAMP
EOF

echo "Logged: $NAME ($TYPE)"
