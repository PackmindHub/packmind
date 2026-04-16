# Standards vs Skills Audit Instructions

You are auditing Packmind playbook artifacts for issues between **standards** and **skills**.

## Context

- **Standards** (`.claude/rules/`) are enforcement rules that constrain how code should be written. They define what is required, forbidden, or preferred.
- **Skills** (`.claude/skills/`) are capability packages that define workflows, tools, and procedures. They instruct Claude how to perform specific tasks.

Conflicts arise when skill instructions violate or contradict standard rules, when both restate the same content, or when one references the other but the target doesn't exist.

## Golden Rule

**Only flag issues where you can point to specific passages in BOTH artifacts.** Do not flag stylistic differences, vague overlaps, or things that "might" conflict. Every finding must cite concrete evidence from both files.

## Detection Categories

### [CONTRADICTION] — Skill instructs behavior that conflicts with a standard

A skill tells Claude to do something that a standard explicitly forbids or vice versa.

**Examples:**
- Standard says "never use console.log in production code" but a skill's workflow includes `console.log` steps
- Standard requires "all API responses must use the Result type" but a skill instructs throwing exceptions
- Standard forbids "direct database queries outside repositories" but a skill tells Claude to write raw SQL

**Verification:** Read BOTH artifacts fully. Quote the specific conflicting passages. The conflict must be direct and unambiguous — not a matter of interpretation.

### [DUPLICATION] — Skill restates rules already covered by a standard

A skill includes inline rules or constraints that are already defined in a standard, creating maintenance burden and drift risk.

**Examples:**
- Standard defines "use camelCase for variables" and a skill repeats "ensure all variables use camelCase"
- Standard specifies test file naming conventions and a skill restates the same naming pattern
- Standard defines import ordering rules and a skill includes the same ordering instructions

**Verification:** The duplication must be substantive (not just incidental mention of the same concept). Both must prescribe the same rule.

### [GAP] — Cross-reference to non-existent artifact

A standard references a skill that doesn't exist, or a skill references a standard that doesn't exist.

**Examples:**
- Standard says "see the deployment skill for details" but no deployment skill exists
- Skill says "this follows the error-handling standard" but no such standard exists
- Standard references a skill by a name that doesn't match any existing skill name

**Verification:** Search the artifact inventory for the referenced artifact. Check both exact name matches and path matches.

## Verification Protocol

For every potential finding:

1. **Read the standard file completely** — locate the specific passage
2. **Read the skill's SKILL.md completely** — locate the specific passage
3. **If the skill has references/, read relevant reference files** that may contain the conflicting content
4. **Quote both passages** in your finding
5. **Confirm the conflict is real** — could both instructions coexist without contradiction? If yes, it's not a finding.

## Output Format

Return findings in this exact format, one per finding:

```
[CATEGORY] [STD-SKL] **{standard-path}** vs **{skill-path}**: {description}
- Evidence-1: "{quoted passage from standard}"
- Evidence-2: "{quoted passage from skill}"
- Rationale: {why this is a real issue}
```

Where `CATEGORY` is one of: `CONTRADICTION`, `DUPLICATION`, `GAP`

If you find **no issues**, return:

```
NO_ISSUES_FOUND
```

## Important Reminders

- Read each artifact file **completely** — don't skip content or rely on summaries
- Standards and skills serve different purposes — a skill *using* a concept that a standard *defines* is complementary, not duplicative
- Different scopes are not contradictions (e.g., a standard for "all TypeScript files" and a skill for "migration files only" can coexist)
- Be thorough but precise — false positives waste reviewer time
- Do NOT suggest fixes — this is detection only
