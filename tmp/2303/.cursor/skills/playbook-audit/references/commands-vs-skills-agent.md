# Commands vs Skills Audit Instructions

You are auditing Packmind playbook artifacts for issues between **commands** and **skills**.

## Context

- **Commands** (`.claude/commands/`) are step-by-step procedures that guide Claude through multi-step workflows. They are typically invoked explicitly by the user (e.g., `/commit`, `/release`).
- **Skills** (`.claude/skills/`) are capability packages with detailed instructions, references, and scripts. They are typically triggered automatically by context or invoked via skill names.

Both define workflows and procedures. Conflicts arise when overlapping workflows have different steps, when both contain the same procedure, or when one references the other but the target doesn't exist.

## Golden Rule

**Only flag issues where you can point to specific passages in BOTH artifacts.** Do not flag stylistic differences, vague overlaps, or things that "might" conflict. Every finding must cite concrete evidence from both files.

## Detection Categories

### [CONTRADICTION] — Same workflow described with conflicting steps

A command and a skill both describe how to perform the same task but prescribe different or incompatible steps.

**Examples:**
- Command says "run tests before building" but skill says "build first, then run tests"
- Command specifies "create a single commit" but skill instructs "create separate commits per sub-task"
- Command says "use npm run" but skill says "use nx" for the same operation

**Verification:** Read BOTH artifacts fully. The workflows must address the same task. Different tasks that happen to share a step name are not contradictions. Quote the specific conflicting steps.

### [DUPLICATION] — Both contain the same procedure

A command and a skill both describe the same procedure or workflow that could be consolidated into one artifact.

**Examples:**
- Both a command and a skill contain the same step-by-step process for creating a pull request
- A command duplicates a validation checklist that is already part of a skill's workflow
- Both describe the same deployment procedure with the same steps

**Verification:** The duplication must be substantial — both must define a multi-step procedure that is recognizably the same. Incidental overlap (e.g., both mentioning "run tests") is not duplication.

### [GAP] — Cross-reference to non-existent artifact

A command references a skill that doesn't exist, or a skill references a command that doesn't exist.

**Examples:**
- Command says "invoke the deployment skill" but no deployment skill exists
- Skill says "this is also available as the /release command" but no release command exists
- Command references a skill by name that doesn't match any existing skill

**Verification:** Search the artifact inventory for the referenced artifact. Check both exact name matches and path matches.

## Verification Protocol

For every potential finding:

1. **Read the command file completely** — locate the specific passage
2. **Read the skill's SKILL.md completely** — locate the specific passage
3. **If the skill has references/, read relevant reference files** that may contain the conflicting content
4. **Quote both passages** in your finding
5. **Confirm the conflict is real** — a command *invoking* a skill (or vice versa) is complementary, not a conflict

## Output Format

Return findings in this exact format, one per finding:

```
[CATEGORY] [CMD-SKL] **{command-path}** vs **{skill-path}**: {description}
- Evidence-1: "{quoted passage from command}"
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
- Commands and skills often work together intentionally — a command that delegates to a skill is complementary, not duplicative
- Different levels of detail are expected: commands are concise step lists, skills are comprehensive guides. This asymmetry is by design.
- Be thorough but precise — false positives waste reviewer time
- Do NOT suggest fixes — this is detection only
