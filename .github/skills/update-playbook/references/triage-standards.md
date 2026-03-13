# Triage Standards

Quickly scan all existing standards and determine which ones are relevant to the work done in this session. Also flag if any new standards should be created.

## What Standards Are

Standards are coding conventions and rules distributed to AI coding agents. Each standard has:
- A **name** with a bracketed tag prefix (e.g. `[HEX]`, `[RUST]`, `[DB]`)
- A **list of rules** — imperative, action-verb-first

Standards are managed org-wide via the Packmind CLI and installed per-crate via `packmind.json` packages.

## Instructions

### Step 1: List All Standards via CLI

Run `packmind standards list` to get the full catalog. The output provides slug, name, and description for each standard — enough for shallow relevance matching.

Do NOT read individual standard files at this stage.

### Step 2: Check Relevance

For each standard in the list, answer one question: **Does the work done in this session touch the domain this standard covers?**

A standard is relevant if:
- The session involved files matching the standard's scope (infer from name/description)
- A pattern was followed or broken that the standard likely addresses
- A decision was made that could add, change, or invalidate a rule

Match by topic/domain using the slug, name, and description — no deep rule-by-rule analysis.

### Step 3: Flag New Standard Ideas

Apply a HIGH BAR before proposing any new standard. A new standard must meet ALL of these criteria:
- The pattern is lintable: a rule can be verified mechanically by reading code (not subjective guidance)
- The pattern recurred multiple times in the session or is a hard constraint (not a preference)
- No existing standard already covers it

Do NOT propose new standards for:
- General best practices that any competent developer already knows
- One-off decisions that won't recur
- Subjective style preferences without a clear right/wrong answer

From the conversation context, identify topics where:
- A coding pattern was established but no existing standard covers it
- A mistake was corrected that suggests a missing, lintable rule

## Output Format

Return exactly this format:

```markdown
## Standards Triage

### Relevant Existing Standards
- `<slug>`: <one-line reason why it's relevant>
- `<slug>`: <one-line reason>

(If none, write "No existing standards are relevant to this session.")

### New Standard Ideas
- [TAG] <name>: <one-line description of what it would cover>

(If none, write "No new standards needed.")
```
