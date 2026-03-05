export const DOMAIN_STANDARDS = `# Standards Domain Analysis

Scan existing standards, identify which are relevant to the session, then perform deep analysis on those in one pass.

## What Standards Are

Standards are coding conventions distributed to AI coding agents. Each standard has a name (with \\\`[TAG]\\\` prefix), description, rules (imperative, ~25 words max each), and scope (file glob). Files live in \\\`.packmind/standards/<slug>.md\\\`.

## Instructions

### Step 1: List Standards

Run \\\`packmind-cli standards list\\\` to get slugs, names, and descriptions. Do NOT read individual standard files yet.

### Step 2: Filter Relevant Standards

For each standard in the list, ask: **Does the work done in this session touch the domain this standard covers?**

Relevant means: the session involved files matching the standard's scope, followed or violated rules this standard likely covers, or made decisions that could add, change, or invalidate a rule. Match by topic using slug, name, and description — no deep reading yet.

Also identify **new standard ideas** from context. A new standard must meet ALL of:
- **Lintable**: mechanically verifiable by reading code (not subjective judgment)
- **Recurring**: pattern occurred multiple times or is a hard constraint (not a one-off)
- **Uncovered**: no existing standard already addresses it

Skip general best practices any competent developer already knows.

### Step 3: Deep Analyze Flagged Standards

For each relevant existing standard, read \\\`.packmind/standards/<slug>.md\\\` and review every rule:
- Followed during the session → still valid
- Violated then corrected → still needed, consider rewording
- Violated and the violation was intentional/correct → outdated, update or remove
- Session has a pattern this standard should cover but doesn't → gap, propose adding a rule

For each new standard idea, draft concrete rules and apply the lintability gate:
- **Mechanically verifiable**: can an agent check compliance by reading code?
- **Clear scope**: does it have a file glob where it applies?
- **Actionable**: does it say exactly what to do (not "prefer X" or "consider Y")?
- **Non-obvious**: would a competent developer NOT already do this without the rule?

Prefer fewer, sharper rules. When in doubt, leave it out.

## Output Format

\\\`\\\`\\\`markdown
## Standards Change Report

### New Standards
(If none: "No new standards needed.")

#### [TAG] Standard Name
- **Scope**: \\\`file/glob/pattern\\\`
- **Reason**: why this pattern warrants a standard
- **Rules**:
  - Rule in imperative form (~25 words max)

### Standard Updates
(If none: "No updates needed.")

#### [TAG] Standard Name (\\\`<slug>\\\`)
- **Reason**: what changed or what's missing
- **Rules to add**: new rule text
- **Rules to modify**: "old text" → "new text"
- **Rules to remove**: "rule text" — reason

### Standards to Deprecate
(If none: "No deprecations needed.")

#### [TAG] Standard Name (\\\`<slug>\\\`)
- **Reason**: why no longer relevant
\\\`\\\`\\\`
`;
