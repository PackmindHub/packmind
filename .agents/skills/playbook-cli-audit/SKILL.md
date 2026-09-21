---
name: 'playbook-cli-audit'
description: 'Audit all packmind-* skills for CLI compatibility issues: deprecated commands, invalid options, wrong file formats, missing flags, and version mismatches against the locally installed Packmind CLI. Use when you want to check that skills referencing packmind-cli are up to date, after a CLI upgrade, before a release, or whenever you suspect skills may reference outdated CLI commands. Also triggers on phrases like "audit CLI usage", "check skills for CLI issues", "are my skills up to date with the CLI", or "CLI compatibility check".'
---

# Playbook CLI Audit

Detect incompatibilities between the packmind-* skills deployed in `.claude/skills/` and the current Packmind CLI. Skills evolve independently from the CLI — when the CLI deprecates or removes commands, renames flags, or changes accepted file formats, skills can silently break. This audit catches those issues before users hit them at runtime.

**This skill only detects issues — it does not fix them.**

## Phase 1: Establish CLI Surface

Build the authoritative map of what the CLI currently supports.

### 1.1 Get CLI version

```bash
node ./dist/apps/cli/main.cjs --version
```

Remember this as `$CLI_VERSION` (e.g., `0.26.0`). If the command fails, try `packmind-cli --version` as a fallback. If both fail, stop and tell the user the CLI is not available.

### 1.2 Build the command map from CLI source code

The CLI command definitions live in `apps/cli/src/infra/commands/`. Read the command registration files to build a complete map of:

- **Available top-level commands** and their subcommands
- **Accepted options/flags** for each command (names, types, whether required)
- **Accepted argument types** (file paths, strings, etc.) and any format constraints
- **Deprecated commands** — look for `[Deprecated]` in descriptions and `has been removed` in handler code
- **Migration paths** — what the deprecated command's error message suggests instead

Structure this internally as a reference table. Here is the expected shape — adapt if the source reveals more or fewer commands:

| Command | Status | Accepted Inputs | Key Flags | Migration |
|---|---|---|---|---|
| `standards create` | REMOVED | JSON file/stdin | `--space`, `--from-skill` | `playbook add <path>` |
| `commands create` | REMOVED | JSON file/stdin | `--space`, `--from-skill` | `playbook add <path>` |
| `skills add` | REMOVED | directory path | `--space`, `--from-skill` | `playbook add <path>` |
| `install --list` | REMOVED | — | — | `packages list` |
| `install --show` | REMOVED | — | — | `packages show <slug>` |
| `diff` | DEPRECATED | — | `--submit`, `-m` | `playbook diff`, `playbook submit` |
| `diff add` | DEPRECATED | file path | `-m` | `playbook add` |
| `lint --diff` | DEPRECATED | — | — | `--changed-files` / `--changed-lines` |
| `playbook add` | ACTIVE | `.md`, `.mdc` files | `--space` | — |
| `playbook submit` | ACTIVE | — | `-m` (needed in non-TTY) | — |
| `packages add` | ACTIVE | — | `--to`, `--standard`/`--command`/`--skill` (one type per call) | — |
| ... | ... | ... | ... | ... |

Do not hardcode this table — **read the actual source** in `apps/cli/src/infra/commands/` to build it. The table above is a starting point to orient your search, not the source of truth.

### 1.3 Print summary

```
CLI version: $CLI_VERSION
Commands mapped: N active, M deprecated/removed
```

## Phase 2: Discover and Scan Skills

### 2.1 Find all packmind-* skills

Glob `.claude/skills/packmind-*/` to find all skill directories. For each, collect:
- `SKILL.md` (the main instruction file)
- All files in subdirectories (`references/`, `steps/`, `scripts/`, `packmind-versions/`, etc.)

### 2.2 Handle version-specific subdirectories

Some skills contain `packmind-versions/<semver>/` directories with version-specific instructions. The version resolution logic works like this:

1. List all version directories (e.g., `0.21.0/`, `0.23.0/`)
2. Compare each against `$CLI_VERSION`
3. A version directory is **in scope** if it is the highest version that is `<=` `$CLI_VERSION`
4. Version directories that are **not in scope** (lower versions superseded by a higher one that is still `<= $CLI_VERSION`) should be flagged as INFO-level findings ("version `0.21.0` is superseded by `0.23.0` for CLI `$CLI_VERSION`") but their CLI invocations still need to be checked — they may still be reachable by users with older CLI versions

**Example**: If `$CLI_VERSION` is `0.25.0` and the skill has `0.21.0/` and `0.23.0/`:
- `0.23.0/` is the **active version** (highest `<= 0.25.0`)
- `0.21.0/` is **superseded** but still scanned

### 2.3 Extract CLI invocations

For every file in scope, extract all lines that invoke the CLI. Look for these patterns:
- `packmind-cli <anything>` — the primary pattern
- `node ./dist/apps/cli/main.cjs <anything>` — local dev invocation
- Code blocks containing CLI commands (inside ` ``` ` fences)
- Inline code references (inside `` ` `` backticks)
- Plain-text references in prose (e.g., "Run `packmind-cli standards create`")

For each invocation, parse:
- **Command**: the top-level command (e.g., `standards`)
- **Subcommand**: if any (e.g., `create`)
- **Arguments**: positional args (e.g., file paths)
- **Flags/options**: named options (e.g., `--space`, `-m`)
- **Source location**: file path and line number

## Phase 3: Cross-Reference and Detect Issues

For each extracted CLI invocation, check it against the command map from Phase 1. Detect these categories of issues:

### CRITICAL — Will fail at runtime

| Check | Description | Example |
|---|---|---|
| **Removed command** | Invocation uses a command the CLI has removed | `standards create` → removed, use `playbook add` |
| **Non-existent command** | Command or subcommand does not exist in the CLI | `packmind-cli list standards` (correct: `standards list`) |
| **Invalid file format** | File type passed to a command that doesn't accept it | `.json` file to `playbook add` (accepts only `.md`/`.mdc`) |
| **Mixed artifact types** | `packages add` called with multiple artifact type flags | `--standard X --command Y` in one call |

### WARNING — May fail or produce unexpected behavior

| Check | Description | Example |
|---|---|---|
| **Deprecated command** | Command works but shows deprecation warning | `diff add` → use `playbook add` |
| **Missing required flag in agent context** | Command lacks a flag needed in non-interactive/CI contexts | `playbook submit` without `-m` opens an editor |
| **Deprecated flag** | A specific flag is deprecated | `lint --diff` → use `--changed-files` |
| **Incorrect install syntax** | `install --list` or `install --show` used instead of `packages list`/`packages show` | `packmind-cli install --list` |

### INFO — Worth noting

| Check | Description | Example |
|---|---|---|
| **Superseded version directory** | A version-specific directory is no longer the active one | `0.21.0/` when `0.23.0/` exists and CLI is `>= 0.23.0` |
| **CLI version metadata mismatch** | Skill frontmatter declares `packmind-cli-version` that conflicts with installed version | `packmind-cli-version: "< 0.25.0"` when CLI is `0.26.0` |
| **Undocumented flag usage** | A flag is used that doesn't appear in the command definition | May indicate a removed or renamed flag |

## Phase 4: Generate Report

Write the report to `playbook-cli-audit-report.md` at the project root.

### Report Structure

```markdown
# Playbook CLI Audit Report

**Generated**: {date}
**CLI version**: {$CLI_VERSION}
**Skills scanned**: {count}
**Files analyzed**: {count}

## Summary

| Severity | Count |
|---|---|
| CRITICAL | {n} |
| WARNING | {n} |
| INFO | {n} |

## Findings

### CRITICAL

#### {n}. [{skill-name}] {short description}

- **File**: `{path}:{line}`
- **Invocation**: `{the CLI command as written in the skill}`
- **Issue**: {what's wrong}
- **Fix**: {what the command should be replaced with}

### WARNING

...same structure...

### INFO

...same structure...

## Skills Scanned

| Skill | Files | Invocations | Issues |
|---|---|---|---|
| packmind-onboard | 19 | 12 | 5 CRITICAL, 1 WARNING |
| packmind-update-playbook | 8 | 15 | 0 |
| ... | ... | ... | ... |

## CLI Command Surface Reference

List of all active commands with their accepted inputs, for quick cross-reference.
```

### If no issues are found

```markdown
# Playbook CLI Audit Report

**Generated**: {date}
**CLI version**: {$CLI_VERSION}
**Skills scanned**: {count}

All packmind-* skills are compatible with the installed CLI version. No issues found.
```

## Phase 5: Present to User

After writing the report:

1. Print a summary to the conversation:
   - Total CRITICAL / WARNING / INFO counts
   - Top 3 most affected skills
   - The report file path
2. If there are CRITICAL findings, highlight them explicitly — these are commands that **will fail** when users invoke the skill

Do not suggest fixes automatically. The user decides how to address each finding.