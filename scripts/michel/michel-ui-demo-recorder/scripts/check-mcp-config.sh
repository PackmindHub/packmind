#!/usr/bin/env bash
# check-mcp-config.sh — confirm the Playwright MCP server is launched with
# --caps=devtools so that browser_start_video, browser_stop_video,
# browser_video_chapter, browser_highlight, and browser_annotate are exposed.
#
# Usage: ./check-mcp-config.sh [path-to-.mcp.json]
# Defaults to ./.mcp.json in the current directory.
#
# Exit codes:
#   0 — config has --caps=devtools
#   1 — config exists but is missing --caps=devtools
#   2 — config file not found
#   3 — playwright entry not found in mcpServers

set -euo pipefail

CONFIG="${1:-./.mcp.json}"

if [[ ! -f "$CONFIG" ]]; then
  echo "MISSING: $CONFIG not found" >&2
  exit 2
fi

if ! grep -q '"playwright"' "$CONFIG"; then
  echo "MISSING: no \"playwright\" entry in $CONFIG" >&2
  exit 3
fi

if grep -q -- '--caps=devtools' "$CONFIG"; then
  echo "OK: --caps=devtools present in $CONFIG"
  exit 0
fi

echo "MISSING: --caps=devtools flag absent in $CONFIG" >&2
echo "Patch the playwright server entry to:" >&2
echo '  "args": ["@playwright/mcp@latest", "--caps=devtools", "--output-dir=./videos"]' >&2
exit 1
