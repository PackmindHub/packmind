---
name: 'agent-skill-frontmatter-audit'
description: 'Audit per-agent SKILL.md frontmatter support in Packmind against the current Agent Skills baseline specification and the latest official docs for each AI coding agent.'
---

# Agent Skill Frontmatter Audit

Packmind renders skills (one of the three artefact types along with standards and commands) as a `SKILL.md` file with YAML frontmatter deployed into each AI coding agent's expected folder (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`, `.agents/skills/`, `.opencode/skills/`, etc.).

There is a shared **Agent Skills baseline specification** that all supporting agents commit to (the "core" fields every agent understands), and then each agent may publish its own documentation extending that baseline with agent-specific "additional properties". Both layers evolve over time: the baseline spec ships new versions, and vendors add, rename, or deprecate extensions.

This skill audits Packmind's rendering against both layers and produces a dated report at the project root so drift can be tracked release over release.

## Context

The audit is a **four-way comparison** per agent:

1. **Baseline spec** — the current Agent Skills specification at <https://agentskills.io/specification.md>. Defines the set of fields every compliant agent is expected to accept (typically `name`, `description`, and similar core keys).
2. **Upstream agent spec** — the agent's own public documentation page. May extend the baseline with agent-specific properties, or may be baseline-only.
3. **Packmind declared support** — the per-agent constants in `packages/types/src/skills/skillAdditionalProperties.ts`.
4. **Packmind actual rendering** — what each agent's deployer in `packages/coding-agent/src/infra/repositories/{agent}/{Agent}Deployer.ts` actually writes into the YAML frontmatter.

The four pairs can disagree silently:

- **Baseline vs. upstream** — a vendor page that omits a field the baseline requires is a vendor bug to note, not a Packmind action item.
- **Upstream vs. constants** — Packmind is behind (or ahead of) the vendor on agent-specific fields.
- **Constants vs. deployer** — internal drift; the "supported" promise in the codebase is a lie.
- **A dead doc URL** — the audit can no longer be trusted automatically for that agent.

None of these produce runtime errors. A deprecated field is silently ignored by the agent; a missing field is a silent feature loss for users. The only way to catch either is an audit against the upstream spec — which is what this skill automates.

### Core principle: baseline-only is fine

Some agents choose to support **only** the baseline spec — no additional properties on top. That is a legitimate design choice and **must not be reported as a warning, gap, or drift**. Concretely: if an agent has no `_ADDITIONAL_FIELDS` constant in Packmind, no `filterAdditionalProperties` call in its deployer, and no agent-specific properties documented upstream, that agent is "baseline-only" and the report should mark it in sync with a short note like *"no additional properties — baseline spec only"*.

Only flag a missing constant / missing filter **when the agent's own upstream documentation lists properties beyond the baseline**. Otherwise the absence is correct.

## Sources in scope

The baseline spec is fetched once. Each of the five agents is fetched individually. Keep this list verbatim — adding, removing, or re-pointing an entry is a skill update, not an ad-hoc decision.

| Source | URL | Codebase locations |
| --- | --- | --- |
| **Baseline spec** | `https://agentskills.io/specification.md` | *(no single file — the baseline names map to core frontmatter emitted by every deployer)* |
| Claude Code | `https://code.claude.com/docs/en/skills` | `CLAUDE_CODE_ADDITIONAL_FIELDS` + `packages/coding-agent/src/infra/repositories/claude/ClaudeDeployer.ts` |
| GitHub Copilot | `https://code.visualstudio.com/docs/copilot/customization/agent-skills` | `COPILOT_ADDITIONAL_FIELDS` + `packages/coding-agent/src/infra/repositories/copilot/CopilotDeployer.ts` |
| Cursor | `https://cursor.com/docs/skills#frontmatter-fields` | `CURSOR_ADDITIONAL_FIELDS` + `packages/coding-agent/src/infra/repositories/cursor/CursorDeployer.ts` |
| OpenAI Codex | `https://developers.openai.com/codex/skills` | *(constant optional — declare one only if upstream lists additional properties)* + `packages/coding-agent/src/infra/repositories/codex/CodexDeployer.ts` |
| OpenCode | `https://opencode.ai/docs/skills/` | *(constant optional — declare one only if upstream lists additional properties)* + `packages/coding-agent/src/infra/repositories/opencode/OpenCodeDeployer.ts` |

The canonical constants file is `packages/types/src/skills/skillAdditionalProperties.ts`.

## Workflow

Run the steps in order. Parallelise fetches and codebase reads whenever one step doesn't depend on another — the audit is network-heavy and the user is waiting for a report.

### Step 1 — Fetch the baseline spec and all upstream docs

Issue `WebFetch` calls in parallel: one for the baseline spec, plus one per agent URL.

**For the baseline spec**, extract:
- The version identifier of the spec (if stated on the page), so the report can cite which baseline was used.
- The complete list of baseline frontmatter keys with whether each is required or optional, and a one-line description quoted from the spec.

**For each agent doc**, extract:
- The complete list of YAML frontmatter keys the agent documents on `SKILL.md`. Separate baseline fields (those already in the baseline spec) from agent-specific additions.
- Any explicit deprecation markers (words like "deprecated", "removed", "no longer supported", "legacy", or strikethrough styling the page renders).
- A short one-line description of each agent-specific key, quoted from the vendor wording rather than invented.
- Whether the agent's docs explicitly declare "this agent supports only the baseline" or equivalent. If so, note it — it's the cleanest signal for the baseline-only classification.

Classify the fetch result of every URL as one of:
- ✅ **Reachable and relevant** — the page loads and documents skills/frontmatter.
- ⚠️ **Redirected** — the URL resolves but lands on a different, still-relevant page. Record both the requested and resolved URLs.
- ❌ **Dead** — 404, 403, empty body, or the landing page no longer mentions skills/frontmatter. Record the exact failure signal.

Do **not** fall back to training-data knowledge for a dead URL. If the baseline spec itself is dead, note that the entire audit cannot separate baseline from agent-specific fields and mark every per-agent classification as `(uncertain — baseline source unreachable)`. If an agent doc is dead, only that agent's findings are marked uncertain.

### Step 2 — Read Packmind's declared support

Read `packages/types/src/skills/skillAdditionalProperties.ts`. Extract:

1. Each per-agent constant that exists (today: `CLAUDE_CODE_ADDITIONAL_FIELDS`, `COPILOT_ADDITIONAL_FIELDS`, `CURSOR_ADDITIONAL_FIELDS`). For each, capture the YAML key ↔ camelCase storage key mapping. Claude Code declares its fields as a `Record<string, string>` (YAML→camel); Cursor and Copilot declare a flat `string[]` of camelCase keys. Do not assume the shape is uniform.
2. `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` — the canonical rendering order for Claude. A key that's in `CLAUDE_CODE_ADDITIONAL_FIELDS` but not in the order array (or vice-versa) is a **low-severity internal drift** worth mentioning.
3. Any new constant that may have been introduced for Codex or OpenCode since this skill was last updated.

**The absence of a constant for Codex or OpenCode is not automatically a finding.** Whether it's a gap depends entirely on Step 1: if the agent's upstream doc lists no properties beyond the baseline, the absence is correct. If it does list extensions, then the absence is a missing-support finding.

### Step 3 — Read the deployer for each agent

For each agent, open its deployer file listed in the scope table. In the file, locate:

- The method that produces the frontmatter block (typically `generateSkillMdContent` or similar). Read which keys it writes and in what order.
- Any call to `filterAdditionalProperties(...)`: which constant does it pass in?
- Any call to `sortAdditionalPropertiesKeys(...)`: missing here means non-deterministic YAML output for that agent's frontmatter.

For Codex and OpenCode, the current pattern is to delegate multi-file skill deployment to `SingleFileDeployer`/base-class logic (see `packages/coding-agent/src/infra/repositories/utils/` and `defaultSkillsDeployer/`). If the deployer has no skill-specific frontmatter method at all, record `(inherits base deployer; baseline fields only)` as the deployer behaviour.

Treat a missing `filterAdditionalProperties` call as a concern **only when** the agent's upstream doc lists additional properties — in that case, the deployer either bypasses the declared list (leaking everything) or emits nothing agent-specific (leaking nothing, failing to expose supported fields). Figure out which from the emitted-keys list and classify accordingly. If the agent is baseline-only upstream, no filter is needed and no finding should be raised.

### Step 4 — Classify every property

For each agent, build a single combined set of keys = (baseline keys) ∪ (agent-upstream keys) ∪ (constant keys) ∪ (deployer-emitted keys). For each key, assign exactly one classification:

- ✅ **In sync (baseline)** — a baseline key, supported by the agent upstream and emitted by the deployer. Expected state; keep it concise in the table.
- ✅ **In sync (agent-specific)** — an agent-specific key that upstream lists, the constant declares, and the deployer emits.
- ➕ **Missing in Packmind** — upstream lists it (baseline or agent-specific) but Packmind doesn't support it. This is the primary "we're behind the spec" bucket.
- ➖ **Deprecated / removed upstream** — the constant or deployer supports it, but upstream no longer lists it (or explicitly deprecates it). Packmind is still shipping a field the agent will ignore.
- 🔀 **Internal drift** — constant and deployer disagree with each other, independent of upstream. Examples: the constant declares a key the deployer never emits; the deployer emits a key the constant never declared; the `_ORDER` array and the `_FIELDS` map disagree.
- ❓ **Uncertain** — the relevant upstream source is unreachable (from Step 1). Do not guess.

**Do not classify baseline-only as a gap.** If the agent's upstream lists no extensions and Packmind declares none, there is nothing to report for additional properties beyond a single one-line note per agent saying *"baseline spec only — no additional properties"*.

Prefer concrete, linkable evidence for every classification. "Missing" must cite the exact vendor section that lists the property; "Deprecated" must cite the exact file:line that still supports it.

### Step 5 — Structural gaps (conditional)

Beyond per-property drift, surface structural gaps at the agent level **only when the evidence warrants it**. Do not raise any of the following for an agent that is legitimately baseline-only:

- Raise *"no constant declared"* **only if** upstream lists additional properties for that agent and Packmind has no way to emit them. An agent with no upstream extensions and no Packmind constant is in sync, not gapped.
- Raise *"deployer bypasses `filterAdditionalProperties`"* **only if** upstream lists additional properties and the deployer writes the additional-props blob without filtering (so unrelated fields could leak through).
- Raise *"deployer renders non-deterministic frontmatter order"* **only if** the deployer actually emits additional properties without a sort call. If there are no additional properties to sort, the absence of `sortAdditionalPropertiesKeys` is fine.
- Raise *"upstream URL redirected or 404d"* whenever Step 1 classified the URL as ⚠️ or ❌ — this is always a finding independent of property state.

If all structural checks pass for every agent, write *"None — all agents structurally aligned with their upstream commitments."* The empty section is still worth keeping so the reader knows the check happened.

### Step 6 — Write the report

Produce a single markdown file at the project root, named using the current date from the system (today is e.g. `2026-04-21` → `skills_properties_2026_04_21.md`). The filename uses underscores between year, month, and day to match the user's convention. Inside the file, the heading date can use dashes (`2026-04-21`) for readability.

Use this exact structure:

```markdown
# Agent Skill Frontmatter Audit — YYYY-MM-DD

## Summary

- Baseline spec version: <version or "unversioned — fetched YYYY-MM-DD">
- Agents audited: N
- Upstream URL health: X/(N+1) reachable and relevant (including baseline)
- Baseline-only agents: …
- Properties in sync: …
- Missing in Packmind: …
- Deprecated / removed upstream: …
- Internal drift findings: …
- Structural gaps: …

## Upstream URL health

| Source | Requested URL | Status | Resolved URL / Notes |
| --- | --- | --- | --- |
| Baseline spec | … | ✅/⚠️/❌ | … |
| <Agent> | … | ✅/⚠️/❌ | … |

## Baseline spec

- **Source:** <url> (<status>)
- **Version / fetched at:** …
- **Core fields:** list the baseline keys with required/optional and a one-line description each.

## Per-agent findings

### <Agent name>
- **Upstream docs:** <url> (<status>)
- **Baseline-only?** Yes / No
- **Declared constant:** `<CONSTANT_NAME>` — `packages/types/src/skills/skillAdditionalProperties.ts:<line>` *(or "none declared — expected for baseline-only agents")*
- **Deployer:** `packages/coding-agent/src/infra/repositories/<agent>/<Agent>Deployer.ts:<line>` — filters via `<constant>` / inherits base / no filter

If the agent is baseline-only and in sync, a single sentence is enough: *"Baseline spec only — no additional properties. Packmind emits the baseline fields via the <deployer/base-class> path; no further action needed."*

Otherwise, include the property table:

| Property | Classification | Baseline | Upstream | Constant | Deployer | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| … | ✅/➕/➖/🔀/❓ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | short rationale / vendor quote |

**Action items** (omit section if empty)
- ➕ Add `<prop>` to `<CONSTANT>` and emit in `<Deployer>` — upstream lists it under "<section>".
- ➖ Remove `<prop>` from `<CONSTANT>` (and deployer if applicable) — upstream no longer documents it.
- 🔀 `<prop>` is declared in `<CONSTANT>` but never emitted by `<Deployer>`; pick one source of truth.

*(Repeat for each of the five agents, even if findings are empty — an empty section still documents that the agent was checked.)*

## Structural gaps

(List only the conditional gaps from Step 5. If none, write "None — all agents structurally aligned with their upstream commitments.")

## Recommendations

Prioritised, plain-language next steps. For each, name the file(s) to touch and why. When a property is newly deprecated upstream, prefer a deprecation path (leave supported for one release, emit a warning, remove next release) rather than immediate removal — users may have existing skill artefacts that rely on the field.
```

Write only the report — no preamble, no "here is the report" sentence. When the skill is invoked the user wants the report itself at the project root, plus a one-line confirmation of where the file was written.

## Notes and edge cases

- **Baseline-only is a valid state.** The skill must never treat the absence of additional properties as a problem. Codex and OpenCode today are typical examples — if their vendor docs don't list extensions beyond the baseline, they're in sync.
- **Dates use underscores in the filename.** `skills_properties_2026_04_21.md`, not `-2026-04-21-` and not without a date. If the user asks for the audit twice the same day, overwrite the file — the day's audit is the authoritative snapshot.
- **Do not invent URLs.** If the user supplies a replacement URL for a dead one, use it and note the substitution in the URL-health table. Otherwise, mark the source uncertain.
- **Do not scan deployed example SKILL.md files** (e.g. what's under `.claude/skills/` in the user's projects) to infer support. The contract is the deployer code and the constants, not the artefacts they happen to have produced so far — an unused supported field would be invisible in that sample.
- **Claude Code is the reference implementation.** Its constants map (`CLAUDE_CODE_ADDITIONAL_FIELDS`) and order array (`CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER`) are the richest and most mature. When in doubt about how a new Codex/OpenCode constant should be shaped (in the event they ever need one), mirror the Claude Code pattern rather than inventing a third shape.
- **Core / baseline fields are tracked by the baseline source, not per-agent.** Put baseline-level observations in the "Baseline spec" section, not duplicated under every agent. Per-agent sections only need to confirm baseline support and then focus on additional properties.
- **Changes in scope (new agents, removed agents, URL updates) are skill edits.** Don't silently drop an agent because its URL 404s this week — that's a finding, not a scope change.
- **Run sequencing.** Fetches (Step 1, including the baseline) and codebase reads (Steps 2–3) don't depend on each other; kick them off in parallel. Steps 4–6 depend on both, so they run after.
