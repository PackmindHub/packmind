#!/usr/bin/env python3
"""Compute which parallel groups are ready to execute next.

Reads:
- context.md (YAML frontmatter with `parallel_groups[]`)
- implementation-plan.md (checkbox state per task)

A group is **completed** when every task in `task_ids` is checked `[x]` AND
not annotated `_(BLOCKED: ...)_`. A group is **partial** when some tasks are
done and some are blocked. A group is **ready** when its status is not yet
`completed` and every group it depends on (`blocked_by`) has status
`completed`.

Output (stdout, JSON):

    {
      "groups": [
        {
          "group_id": "A",
          "group_name": "backend-foo",
          "repo": "oss",
          "status": "ready" | "completed" | "partial" | "blocked",
          "task_ids": ["1.1", "1.2"],
          "completed_ids": ["1.1"],
          "blocked_ids": [],
          "blocked_by": []
        }
      ],
      "ready_group_ids": ["A"],
      "all_completed": false
    }

Requires PyYAML. Exit 1 on missing files or malformed YAML.
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print(
        "Error: PyYAML is required (pip install pyyaml)",
        file=sys.stderr,
    )
    sys.exit(1)


FRONTMATTER = re.compile(r"^---\n(.*?)\n---", re.DOTALL)
TASK_STATE = re.compile(
    r"^-\s\[(?P<state>[ x])\]\s\*\*(?P<id>\d+(?:\.\d+)+):\s.+?\*\*"
    r"(?P<blocked>\s+_\(BLOCKED:.+?\)_)?\s*$",
    re.MULTILINE,
)


def load_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER.match(text)
    if not match:
        print(f"Error: no YAML frontmatter in {path}", file=sys.stderr)
        sys.exit(1)
    try:
        data = yaml.safe_load(match.group(1))
    except yaml.YAMLError as exc:
        print(f"Error: invalid YAML in {path}: {exc}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(data, dict):
        print(f"Error: frontmatter must be a mapping in {path}", file=sys.stderr)
        sys.exit(1)
    return data


def extract_task_state(plan_path: Path) -> dict[str, dict]:
    states: dict[str, dict] = {}
    for match in TASK_STATE.finditer(plan_path.read_text(encoding="utf-8")):
        states[match.group("id")] = {
            "completed": match.group("state") == "x",
            "blocked": bool(match.group("blocked")),
        }
    return states


def classify_group(group: dict, task_state: dict[str, dict]) -> dict:
    task_ids = group.get("task_ids", []) or []
    completed: list[str] = []
    blocked: list[str] = []
    for task_id in task_ids:
        info = task_state.get(task_id)
        if info is None:
            continue
        if info["completed"]:
            completed.append(task_id)
        elif info["blocked"]:
            blocked.append(task_id)

    if task_ids and len(completed) == len(task_ids):
        status = "completed"
    elif blocked and (len(completed) + len(blocked)) == len(task_ids):
        status = "partial"
    else:
        status = "pending"  # may become "ready" after dep check

    return {
        "group_id": group.get("group_id"),
        "group_name": group.get("group_name"),
        "repo": group.get("repo"),
        "task_ids": task_ids,
        "blocked_by": group.get("blocked_by", []) or [],
        "target_files": group.get("target_files", []) or [],
        "status": status,
        "completed_ids": completed,
        "blocked_ids": blocked,
    }


def resolve_readiness(groups: list[dict]) -> None:
    by_id = {g["group_id"]: g for g in groups}
    for group in groups:
        if group["status"] in ("completed", "partial"):
            continue
        deps_done = all(
            by_id.get(dep, {}).get("status") == "completed"
            for dep in group["blocked_by"]
        )
        group["status"] = "ready" if deps_done else "blocked"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("context", help="Path to context.md")
    parser.add_argument("plan", help="Path to implementation-plan.md")
    args = parser.parse_args()

    context_path = Path(args.context)
    plan_path = Path(args.plan)
    for path, label in [(context_path, "context"), (plan_path, "plan")]:
        if not path.exists():
            print(f"Error: {label} file not found: {path}", file=sys.stderr)
            return 1

    frontmatter = load_frontmatter(context_path)
    parallel_groups = frontmatter.get("parallel_groups") or []
    if not isinstance(parallel_groups, list):
        print("Error: parallel_groups must be a list", file=sys.stderr)
        return 1

    task_state = extract_task_state(plan_path)
    groups = [classify_group(g, task_state) for g in parallel_groups]
    resolve_readiness(groups)

    ready_ids = [g["group_id"] for g in groups if g["status"] == "ready"]
    all_completed = bool(groups) and all(g["status"] == "completed" for g in groups)

    result = {
        "groups": groups,
        "ready_group_ids": ready_ids,
        "all_completed": all_completed,
    }
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
