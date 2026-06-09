# Per-Group Subagent Prompt Template

Loaded by `phase-2-execute.md` step 2.3. The orchestrator substitutes every
`{placeholder}` (and the `{TASKS_BLOCK}` section) with concrete values, then
passes the result as the `prompt` argument to `Agent` with
`subagent_type="general-purpose"`.

## Placeholders

| Placeholder | Source |
|-------------|--------|
| `{group_id}` | `context.md` → `parallel_groups[*].group_id` |
| `{group_name}` | `context.md` → `parallel_groups[*].group_name` |
| `{task_slug}` | spec directory name (`tmp/feature-specs/{slug}/`) |
| `{repo}` | `parallel_groups[*].repo` (`oss` or `proprietary`) |
| `{repo_root}` | absolute path: `oss_root` or `proprietary_root` from `context.md` |
| `{proprietary_root}` | always `context.md` → `proprietary_root` (spec artifacts live here) |
| `{TASKS_BLOCK}` | concatenation of each task's `raw_block` from `parse_implementation_plan.py` output |

## Template

```
Execute sprint group {group_id}: {group_name} for feature {task_slug}.

## Working repo
- Repo: {repo}
- Root (absolute path): {repo_root}
- All file paths in tasks are relative to this root unless otherwise noted.

## Context files (read in this exact order)
1. {proprietary_root}/tmp/feature-specs/{task_slug}/context.md
2. {proprietary_root}/tmp/feature-specs/{task_slug}/functional-spec.md
3. {proprietary_root}/tmp/feature-specs/{task_slug}/discovery.md
4. {proprietary_root}/tmp/feature-specs/{task_slug}/implementation-plan.md

Note: spec artifacts live in the PROPRIETARY repo's tmp/ even when implementation
targets OSS. Always read from `{proprietary_root}/tmp/feature-specs/{task_slug}/`.

## Your tasks (in this exact order)

{TASKS_BLOCK}

## Rules

1. For each task in order:
   a. Re-read the task block in implementation-plan.md for full detail
   b. Open the Reference file:line — that is your pattern template
   c. Implement the task following the Packmind conventions established in discovery.md
   d. If the task is a backend domain/application/infra task, respect the hexagonal-architecture skill at `{proprietary_root}/.claude/skills/hexagonal-architecture/`
   e. If the task is a frontend task, respect `working-with-pm-design-kit` and `gateway-pattern-implementation-in-packmind-frontend`
   f. If the task is a migration, respect `how-to-write-typeorm-migrations-in-packmind`
   g. After finishing the task, output exactly: `TASK_COMPLETE: {task_id}`

2. NEVER import from `@packmind/editions` unless the file you're editing already lives inside `packages/editions/` (this is enforced by `.claude/rules/packmind/packmind-proprietary.md`).

3. Run `./node_modules/.bin/nx lint <project>` and `./node_modules/.bin/nx test <project>` after finishing each Nx project's tasks within the group. If anything fails, fix it before moving on.

4. After ALL tasks in this group are complete, output exactly:
   ```
   GROUP_COMPLETE: {group_id}
   COMPLETED_TASKS: <comma-separated task_ids>
   FILES_MODIFIED: <list of absolute file paths you changed>
   ```

5. If you encounter a blocker:
   - Output: `BLOCKED: <task_id> - <short reason>`
   - Continue with later tasks in this group only if they don't depend on the blocked task
   - At the end, list blocked tasks in your group summary

## Hard constraints

- Do NOT commit changes — the main session handles commits per group
- Do NOT modify `implementation-plan.md` checkboxes — the main session handles sync-back
- Do NOT modify any file in `{proprietary_root}/tmp/feature-specs/{task_slug}/`
- Focus only on implementing the listed task IDs; do not "improve" unrelated files
- Use absolute paths in your Bash calls so they work regardless of your cwd

## Tools you should rely on

- Read, Edit, Write for code changes
- Bash with absolute paths for `nx lint`, `nx test`, `nx build` in the working repo
- Glob/Grep within the working repo for navigation
- Avoid spawning further subagents (`Agent`) — flatten everything in this one
```
