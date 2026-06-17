#!/usr/bin/env python3
"""Parse a feature-sprint implementation-plan.md into structured JSON.

Reads checkbox tasks of the form:

    - [ ] **1.2: short description**
      - Repo: oss
      - Layer: application
      - Files: packages/foo/...
      - Reference: packages/bar/baz.ts:42
      - Notes: free text

and emits JSON to stdout:

    {
      "tasks": [
        {
          "id": "1.2",
          "completed": false,
          "description": "short description",
          "metadata": {
            "repo": "oss",
            "layer": "application",
            "files": "packages/foo/...",
            "reference": "packages/bar/baz.ts:42",
            "notes": "free text"
          },
          "blocked_reason": null,
          "raw_block": "..."
        }
      ],
      "summary": {"total": 1, "completed": 0, "pending": 1, "blocked": 0}
    }

Tasks annotated with `_(BLOCKED: reason)_` after the description carry that
reason on `blocked_reason`. The full markdown block (including indented
metadata lines) is preserved on `raw_block` so the orchestrator can paste it
verbatim into subagent prompts without re-reading the file.
"""

import argparse
import json
import re
import sys
from pathlib import Path

TASK_LINE = re.compile(
    r"""^-\s\[(?P<state>[ x])\]\s\*\*
        (?P<id>\d+(?:\.\d+)+):\s
        (?P<desc>.+?)\*\*
        (?:\s+_\(BLOCKED:\s(?P<blocked>.+?)\)_)?
        \s*$""",
    re.VERBOSE,
)
META_LINE = re.compile(r"^\s+-\s(?P<key>[A-Za-z]+):\s*(?P<value>.*)$")


def parse(content: str) -> dict:
    tasks: list[dict] = []
    current: dict | None = None
    raw_lines: list[str] = []

    def flush() -> None:
        if current is None:
            return
        current["raw_block"] = "\n".join(raw_lines).rstrip()
        tasks.append(current)

    for line in content.splitlines():
        task_match = TASK_LINE.match(line)
        if task_match:
            flush()
            raw_lines = [line]
            current = {
                "id": task_match.group("id"),
                "completed": task_match.group("state") == "x",
                "description": task_match.group("desc").strip(),
                "metadata": {},
                "blocked_reason": task_match.group("blocked"),
                "raw_block": "",
            }
            continue

        if current is None:
            continue

        meta_match = META_LINE.match(line)
        if meta_match:
            raw_lines.append(line)
            key = meta_match.group("key").lower()
            value = meta_match.group("value").strip()
            current["metadata"][key] = value
            continue

        if line.startswith("- [") or (line.strip() == "" and len(raw_lines) > 1):
            flush()
            current = None
            raw_lines = []
            continue

        if line.strip():
            raw_lines.append(line)

    flush()

    completed = sum(1 for t in tasks if t["completed"])
    blocked = sum(1 for t in tasks if t["blocked_reason"])
    return {
        "tasks": tasks,
        "summary": {
            "total": len(tasks),
            "completed": completed,
            "pending": len(tasks) - completed,
            "blocked": blocked,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("plan", help="Path to implementation-plan.md")
    parser.add_argument(
        "--ids-only",
        action="store_true",
        help="Print only the task IDs (one per line) instead of JSON",
    )
    parser.add_argument(
        "--pending-only",
        action="store_true",
        help="Filter to non-completed tasks before printing",
    )
    args = parser.parse_args()

    path = Path(args.plan)
    if not path.exists():
        print(f"Error: plan file not found: {path}", file=sys.stderr)
        return 1

    result = parse(path.read_text(encoding="utf-8"))

    if args.pending_only:
        result["tasks"] = [t for t in result["tasks"] if not t["completed"]]

    if args.ids_only:
        for task in result["tasks"]:
            print(task["id"])
        return 0

    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
