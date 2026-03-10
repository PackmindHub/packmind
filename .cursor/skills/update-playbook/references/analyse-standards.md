# Analyse Standards (Deep)

Perform a detailed analysis of the pre-filtered standards listed in the "Relevant Artifacts" section above. Determine exactly what needs to change.

## What Standards Are

Standards are coding conventions and rules distributed to AI coding agents. Each standard has:
- A **name** with a bracketed tag prefix (e.g. `[HEX]`, `[RUST]`, `[DB]`)
- A **one-sentence description**
- A **list of rules** — imperative, action-verb-first, ~25 words max each
- A **scope** — file glob pattern where the standard applies

Standards live in `.packmind/standards/<slug>.md`.

## Instructions

### Step 1: Read Flagged Standards

For each slug listed in the "Relevant Artifacts" section, read the full standard file from `.packmind/standards/<slug>.md`. Extract every rule.

### Step 2: Compare Rules Against Context

For each rule in each flagged standard:
- Was this rule followed during the session? (confirms it's still valid)
- Was this rule violated and then corrected? (confirms it's needed, possibly needs rewording)
- Was this rule violated and the violation was correct? (rule is outdated — update or remove)
- Is there a pattern from the session that this standard should cover but doesn't? (gap — add rule)

### Step 3: Evaluate New Standard Ideas

Apply a HIGH BAR. Most sessions should NOT produce new standards. For each new standard idea from triage:
- Draft concrete rules (imperative, action-verb-first, ~25 words max)
- Define the scope (file glob)
- Verify it's a recurring pattern, not a one-off decision
- Verify no existing standard already covers it

### Step 4: Lintability Gate

Every proposed rule (new or updated) MUST pass this gate. Reject rules that fail:
- **Mechanically verifiable**: Can an agent check compliance by reading code? If it requires subjective judgment, reject it.
- **Clear scope**: Does the rule have a file glob where it applies?
- **Actionable**: Does the rule tell you exactly what to do (not vague guidance like "prefer X" or "consider Y")?
- **Non-obvious**: Would a competent developer NOT already do this without the rule?

Prefer fewer, sharper rules over many vague ones. When in doubt, leave it out.

## Output Format

```markdown
## Standards Analysis Report

### New Standards Proposed

#### [TAG] Standard Name
- **Reason**: Why this standard is needed
- **Scope**: File glob where it applies
- **Proposed rules**:
  * Rule 1 in imperative form
  * Rule 2 in imperative form

(If none, write "No new standards needed.")

### Updates to Existing Standards

#### [TAG] Existing Standard Name (`<slug>`)
- **Reason**: What changed or what's missing
- **Rules to add**:
  * New rule in imperative form
- **Rules to modify**:
  * Old: "existing rule text" → New: "updated rule text"
- **Rules to remove**:
  * "rule text" — reason for removal

(If none, write "No updates needed.")

### Standards to Deprecate

#### [TAG] Standard Name (`<slug>`)
- **Reason**: Why this standard is no longer relevant

(If none, write "No deprecations needed.")
```
