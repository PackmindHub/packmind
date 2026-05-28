# Standards vs Commands Audit Instructions

You are auditing Packmind playbook artifacts for issues between **standards** and **commands**.

## Context

- **Standards** (`.claude/rules/`) are enforcement rules that constrain how code should be written. They define what is required, forbidden, or preferred.
- **Commands** (`.claude/commands/`) are step-by-step procedures that guide Claude through multi-step workflows. They define sequences of actions to accomplish specific tasks.

Conflicts arise when command steps violate standard rules, when commands restate rules already in standards, or when one references the other but the target doesn't exist.

## Golden Rule

**Only flag issues where you can point to specific passages in BOTH artifacts.** Do not flag stylistic differences, vague overlaps, or things that "might" conflict. Every finding must cite concrete evidence from both files.

## Detection Categories

### [CONTRADICTION] — Command steps violate a standard rule

A command instructs Claude to perform an action that a standard explicitly forbids, or skips a step that a standard requires.

**Examples:**
- Standard says "always run linting before committing" but a command's commit workflow skips linting
- Standard requires "use TypeORM migrations for schema changes" but a command tells Claude to modify the database directly
- Standard forbids "hardcoded secrets in source" but a command includes a step with inline credentials

**Verification:** Read BOTH artifacts fully. Quote the specific conflicting passages. The conflict must be direct — a command omitting a step is only a contradiction if the standard explicitly requires it.

### [DUPLICATION] — Command restates standard rules inline

A command includes rules or constraints inline that are already defined in a standard, creating maintenance burden and drift risk.

**Examples:**
- Standard defines commit message format and a command repeats the same format rules
- Standard specifies test execution commands and a command restates the same commands
- Standard defines code review checklist items and a command duplicates them as steps

**Verification:** The duplication must be substantive — both must prescribe the same rule or procedure. A command merely *following* a standard (without restating it) is not duplication.

### [GAP] — Cross-reference to non-existent artifact

A standard references a command that doesn't exist, or a command references a standard that doesn't exist.

**Examples:**
- Standard says "use the release command to publish" but no release command exists
- Command says "this follows the security standard" but no such standard exists
- Standard references a command by a name that doesn't match any existing command

**Verification:** Search the artifact inventory for the referenced artifact. Check both exact name matches and path matches.

## Verification Protocol

For every potential finding:

1. **Read the standard file completely** — locate the specific passage
2. **Read the command file completely** — locate the specific passage
3. **Quote both passages** in your finding
4. **Confirm the conflict is real** — could both instructions coexist without contradiction? If yes, it's not a finding.

## Output Format

Return findings in this exact format, one per finding:

```
[CATEGORY] [STD-CMD] **{standard-path}** vs **{command-path}**: {description}
- Evidence-1: "{quoted passage from standard}"
- Evidence-2: "{quoted passage from command}"
- Rationale: {why this is a real issue}
```

Where `CATEGORY` is one of: `CONTRADICTION`, `DUPLICATION`, `GAP`

If you find **no issues**, return:

```
NO_ISSUES_FOUND
```

## Important Reminders

- Read each artifact file **completely** — don't skip content or rely on summaries
- Commands *implementing* what standards *require* is complementary, not duplicative — only flag when the command restates the rule itself
- A command that is more specific than a standard is not a contradiction (e.g., standard says "test before commit", command specifies "run nx test then nx lint" — this is implementation, not contradiction)
- Be thorough but precise — false positives waste reviewer time
- Do NOT suggest fixes — this is detection only
