#!/usr/bin/env python3
"""Batch-update task checkboxes in a feature-sprint implementation-plan.md.

Supports two operations in a single pass:

  --complete 1.1,1.2,2.3            Flip `- [ ] **{id}:` to `- [x] **{id}:`
  --blocked '3.1:reason' '3.2:r2'   Annotate `- [ ] **{id}: desc**` with
                                    `_(BLOCKED: reason)_` (keeps the checkbox
                                    unchecked so resume picks it up).

`--blocked` accepts one pair per argument so reasons can contain commas
freely (e.g. `'3.1:waiting on API, see #123'`). Pass either flag without
values, or omit it entirely, when the corresponding list is empty.

Already-completed tasks (`[x]`) are left alone. Tasks already annotated
BLOCKED have their annotation replaced if a new reason is supplied. Any task
ID passed but not found in the file is reported on stderr; exit code is 1 if
any IDs were not applied, 0 otherwise.

Output (stdout, JSON):

    {
      "applied_complete": ["1.1", "1.2"],
      "applied_blocked":  [{"id": "3.1", "reason": "..."}],
      "missing":          ["9.9"]
    }
"""

import argparse
import json
import re
import sys
from pathlib import Path


def parse_id_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def parse_blocked_list(items: list[str] | None) -> list[tuple[str, str]]:
    if not items:
        return []
    pairs = []
    for item in items:
        item = item.strip()
        if not item:
            continue
        if ":" not in item:
            print(
                f"Error: --blocked entry '{item}' missing ':reason'",
                file=sys.stderr,
            )
            sys.exit(2)
        task_id, reason = item.split(":", 1)
        pairs.append((task_id.strip(), reason.strip()))
    return pairs


def task_line_pattern(task_id: str) -> re.Pattern[str]:
    # Match the exact task line, preserving the description and any trailing
    # markup. Captures: 1=state ([ ] or [x]), 2=description, 3=optional
    # BLOCKED annotation already present.
    return re.compile(
        rf"^-\s\[(?P<state>[ x])\]\s\*\*{re.escape(task_id)}:\s(?P<desc>.+?)\*\*"
        r"(?P<blocked>\s+_\(BLOCKED:.+?\)_)?\s*$",
        re.MULTILINE,
    )


def apply_complete(content: str, ids: list[str]) -> tuple[str, list[str], list[str]]:
    applied: list[str] = []
    missing: list[str] = []
    for task_id in ids:
        pattern = task_line_pattern(task_id)
        match = pattern.search(content)
        if not match:
            missing.append(task_id)
            continue
        if match.group("state") == "x":
            applied.append(task_id)  # idempotent — already complete
            continue
        # Replace the matched line: flip state, strip any BLOCKED annotation
        new_line = f"- [x] **{task_id}: {match.group('desc')}**"
        content = content[: match.start()] + new_line + content[match.end():]
        applied.append(task_id)
    return content, applied, missing


def apply_blocked(
    content: str, pairs: list[tuple[str, str]]
) -> tuple[str, list[dict], list[str]]:
    applied: list[dict] = []
    missing: list[str] = []
    for task_id, reason in pairs:
        pattern = task_line_pattern(task_id)
        match = pattern.search(content)
        if not match:
            missing.append(task_id)
            continue
        if match.group("state") == "x":
            # Already complete — don't re-annotate
            continue
        new_line = (
            f"- [ ] **{task_id}: {match.group('desc')}** "
            f"_(BLOCKED: {reason})_"
        )
        content = content[: match.start()] + new_line + content[match.end():]
        applied.append({"id": task_id, "reason": reason})
    return content, applied, missing


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("plan", help="Path to implementation-plan.md")
    parser.add_argument(
        "--complete",
        help="Comma-separated task IDs to mark complete (e.g. 1.1,1.2)",
    )
    parser.add_argument(
        "--blocked",
        nargs="*",
        default=[],
        help=(
            "One or more 'id:reason' pairs, each as a single argument so "
            "reasons may contain commas "
            "(e.g. --blocked '3.1:waiting on API, see #123' '3.2:other')"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing the file",
    )
    args = parser.parse_args()

    path = Path(args.plan)
    if not path.exists():
        print(f"Error: plan file not found: {path}", file=sys.stderr)
        return 1

    completes = parse_id_list(args.complete)
    blocks = parse_blocked_list(args.blocked)

    if not completes and not blocks:
        print(
            "Error: at least one of --complete or --blocked is required",
            file=sys.stderr,
        )
        return 2

    content = path.read_text(encoding="utf-8")
    content, applied_complete, missing_complete = apply_complete(content, completes)
    content, applied_blocked, missing_blocked = apply_blocked(content, blocks)

    if not args.dry_run:
        path.write_text(content, encoding="utf-8")

    result = {
        "applied_complete": applied_complete,
        "applied_blocked": applied_blocked,
        "missing": sorted(set(missing_complete + missing_blocked)),
        "dry_run": args.dry_run,
    }
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")

    return 1 if result["missing"] else 0


if __name__ == "__main__":
    sys.exit(main())
