# Token-Inflation Patterns

Detectors for `audit-skill-context`. Patterns split into two families:

- **Workflow patterns (P1–P3, P5, P8, P10, P12)** — agent-judgment. The script can't reliably semantic-match these; the agent must read the corpus and apply them.
- **Loading patterns (P4, P6, P7, P9, P11, P13, P14, P15)** — preflight emits candidates; the agent only validates (drop false positives, confirm priority).

Do not fire a detector on speculative matches. If you cannot point to a specific line range and quote a verbatim excerpt, skip it.

---

## P1 — Deterministic ops → script

**Signal**: Sequential, parameter-free shell/MCP commands the agent must run in order, then parse and branch on their output. Typically a numbered list of `bash`/`MCP call` blocks with trailing "remember this as $VAR" prose.

**Why expensive**: Every invocation re-ingests the command list, parsing rules, and variable names. A single script returning JSON collapses N commands into one Read.

**Fix**: Extract to `scripts/<name>.<ext>` and have it return structured output (JSON). Reference it from SKILL.md with one line.

**Priority**:
- HIGH if ≥4 sequential commands with output-parsing prose.
- MEDIUM if 2–3 commands.
- LOW if commands are genuinely different on each run (not truly deterministic).

## P2 — Complex workflow → simplified

**Signal**: Decision trees with 3+ branches expressed in prose ("if no packages exist, do A; if one exists, do B; if multiple, do C"). Nested conditionals two or more levels deep. Phases that could be one conceptual step.

**Why expensive**: The agent holds the full tree in working memory even though only one branch fires per run.

**Fix**: Let a preflight script or earlier phase resolve the branch and pass a single state value; keep only the relevant branch in SKILL.md, or dispatch to a branch-specific reference file.

**Priority**:
- HIGH for 3+ branches or nested 2-level trees.
- MEDIUM for two-way branches with heavy prose.
- LOW for simple guard clauses ("if X is missing, tell the user").

## P3 — File edits → script

**Signal**: Formulaic, multi-file edits with explicit ordering ("update the version in two manifest files, then add a section to the changelog, then regenerate the lockfile"). Template-string interpolation described in prose.

**Why expensive**: Each edit instruction reloads into context every run; the agent must re-derive the template each time.

**Fix**: Single script accepting parameters (`version`, `date`); SKILL.md calls it with one line.

**Priority**:
- HIGH for ≥3 files with cross-file consistency requirements.
- MEDIUM for 2-file edits.
- LOW for a single-file formulaic edit.

## P4 — Large inline blocks → `assets/`

**Signal**: Code/markdown blocks ≥40 lines inlined in SKILL.md, used only at *execution* time (final output shaping), not at *decision* time. Usually appears under headings like "Output Format", "Examples", "Template", "Scaffold".

**Why expensive**: Loaded on every trigger; only needed once per run at the final step.

**Fix**: Move to `assets/<name>.md`. Reference it with "read this at Step N before writing output".

**Priority**:
- HIGH for ≥100-line blocks.
- MEDIUM for 40–100-line blocks.
- LOW if the block is already cited but duplicated inline.

**Validation** (script-emitted): Drop the candidate if the block is mostly comments or formatting markers (e.g. JSON schema with property docs) — those have to stay inline. Keep if it's example output, scaffold, or template.

## P5 — Multi-step read-then-grep → one script

**Signal**: Instructions chained as "read file A, extract X; grep for X in files matching Y; read each match; extract Z." Three or more file operations the agent cannot parallelize because each depends on the previous.

**Why expensive**: Each read/grep is a separate tool call and context hit; a single script loads once and returns the final structure.

**Fix**: Consolidate into one script returning the terminal data structure. SKILL.md calls the script and consumes the result directly.

**Priority**:
- HIGH for ≥3 chained dependent operations.
- MEDIUM for 2 chained operations.
- LOW for 2-step reads without grep interleaving.

## P6 — Verbose prose / rationale → `references/`

**Signal**: Multi-paragraph background, architecture explanation, or rationale that does not change the agent's next action. Typical headings: "Context", "Definitions", "Background", "Guarantees", "Philosophy", "Why this matters".

**Why expensive**: Loaded every trigger; only relevant when the agent is disambiguating unusual situations.

**Fix**: Move to `references/context.md` or similar; keep a one-line summary in SKILL.md plus "read this when <trigger>".

**Priority**:
- HIGH for ≥80 lines of pure prose with no direct instructions.
- MEDIUM for 40–80 lines.
- LOW for short rationale blocks (<40 lines).

**Validation** (script-emitted): Drop the candidate if the run is *structured* prose (numbered phases, sub-steps, decision points) rather than narrative rationale. Keep if it reads as background/explanation that could move to a reference file.

## P7 — Repeated boilerplate → parameterized template

**Signal**: The same structural scaffold repeated ≥3 times with minor variance — same agent-prompt shape with a different section name, same phase template with different file targets, same output-format block with different headers.

**Why expensive**: Duplicates the common structure in context N times when one template plus variant data would suffice.

**Fix**: Extract shared template to `references/template.md` with placeholders; enumerate only the variant data inline in SKILL.md.

**Priority**:
- HIGH for ≥4 repetitions or repetitions >20 lines each.
- MEDIUM for exactly 3 repetitions.
- LOW for duplication <10 lines each.

**Validation** (script-emitted): The 5-line shingle hash can fire on incidental matches (boilerplate license headers, repeated separators, identical empty bullet lists). Drop if the "repetition" is structural framing rather than meaningful duplicated content.

## P8 — Conditionals a preflight script could resolve

**Signal**: `if <version> / if <file exists> / if <count>` decisions the agent evaluates *after* reading instructions, when a small script could settle the question *before* any skill text is read.

**Why expensive**: The agent holds all branches in context to evaluate one. The resolved value is often a single string or boolean.

**Fix**: Preflight script emits the resolved value; SKILL.md branches on the resolved value, not the raw inputs.

**Priority**:
- HIGH when the conditional gates a large block (>50 lines) of downstream instructions.
- MEDIUM when it gates 20–50 lines.
- LOW for small conditionals (<20 lines).

## P9 — Bloated frontmatter description

**Signal**: SKILL.md `description:` field >100 words, especially with repetitive trigger phrasing ("Use when …", "Triggers on …", "Also triggers on …" stacked).

**Why expensive**: The description is loaded into *every* Claude Code session globally for trigger matching, regardless of whether the skill ever fires. A 200-word description is paid by every conversation across the whole user base — far more leverage than any in-body fix.

**Fix**: Tighten to one sentence stating what the skill does plus a short trigger clause naming the user phrases that should fire it. Drop redundant restatements ("Use when X. Triggers on X. Should be used when X.").

**Priority**:
- HIGH if >150 words.
- MEDIUM if 100–150 words.
- LOW if 80–100 words and contains ≥3 redundant phrase patterns.

**Validation** (script-emitted): Always keep — description bloat is unambiguous. Adjust priority based on `redundantPhraseCount`: high redundancy escalates priority; low redundancy can downgrade.

## P10 — Phase-gated content kept inline

**Signal**: Phase / Step / "If validation fails" sections ≥30 lines that the agent only reaches conditionally (gated by a guard at a prior phase, error path, or rare branch).

**Why expensive**: The phase loads on every trigger but executes <20% of the time. P2 covers the decision tree itself; P10 catches the *content* under a rarely-fired branch.

**Fix**: Move the gated content to `references/phase-N.md` or `references/<branch>.md`. Replace inline with one line: "if condition X, follow `references/phase-N.md`".

**Priority**:
- HIGH for ≥80 lines of gated content.
- MEDIUM for 40–80 lines.
- LOW for 30–40 lines.

## P11 — Verbose tool-invocation prose

**Signal**: Lines of the form "Use the Read tool to open X", "Invoke the Bash tool with `command=...`", "Call the WebFetch tool". The harness already describes tools to the agent; restating their use inflates without adding signal.

**Why expensive**: Pure ceremony. The agent already knows how to call tools; replacing imperative prose ("Read X.") with tool-named prose ("Use the Read tool to open X.") adds 5–10 tokens per occurrence with zero behavioral effect.

**Fix**: Replace with the imperative ("Read X", "Run `cmd`", "Fetch URL").

**Priority**:
- LOW unless ≥10 occurrences (then MEDIUM).

**Validation** (script-emitted): Most candidates are real. Drop only when the prose names a *non-obvious* tool the agent would otherwise miss (e.g. an MCP-specific tool with a particular parameter shape).

## P12 — Self-referential / meta prose

**Signal**: Paragraphs that describe the skill rather than instruct. "This skill detects X. The purpose of this skill is Y. As described above…". "What this skill does NOT do" enumerations.

**Why expensive**: Authoring-time scaffolding that the agent doesn't need at runtime. The next-action remains unchanged whether or not the agent reads "this skill is intended for…".

**Fix**: Remove, or move to `references/scope.md` for archival reference. The positive instructions imply the boundary.

**Priority**:
- MEDIUM for ≥20 lines of meta prose (intro + scope + "does NOT" combined).
- LOW for shorter meta blocks.

## P13 — Cross-file content duplication

**Signal**: ≥5 consecutive lines repeated across two or more files in the corpus (e.g. a paragraph in SKILL.md duplicated verbatim in `references/foo.md`).

**Why expensive**: Both files load and pay tokens for the duplicate content. The agent processes it twice.

**Fix**: Keep the content in one place (typically the reference file). Cite from the other.

**Priority**:
- HIGH for duplicated blocks ≥15 lines.
- MEDIUM for 10–15 lines.
- LOW for 5–10 lines (often incidental — common phrasing rather than true duplication).

**Validation** (script-emitted): Drop if the "duplication" is structural framing (table headers, common section names like "## Output Format", license boilerplate). Keep if it's substantive content.

## P14 — Eager-load anti-pattern

**Signal**: Instructions that fan-read all references unconditionally — "Phase 2: Read every file in `filesToRead`", "Read all references before Phase 3", "For each artifact, read the pair and apply the same checks".

**Why expensive**: Defeats the entire point of a `references/` directory. References are designed to load on demand — when the agent needs the content, not as a default before any work begins.

**Fix**: Gate each file behind the phase that actually needs it. Replace "Read all references" with "Read `references/X.md` when validating P4 candidates" / "Read `references/Y.md` only when computing the score."

**Priority**:
- HIGH if the eager-load is unconditional and references >2 files.
- MEDIUM for 2-file eager loads.
- LOW for single-file eager loads (often unavoidable).

**Validation** (script-emitted): Drop if the matched line is describing data shape or tool output (e.g. "every file in `filesToRead` has these fields") rather than instructing the agent to read them.

## P15 — Top-of-file context lag (preamble)

**Signal**: Many lines from the start of SKILL.md (after frontmatter) before the agent encounters its first concrete imperative ("Run", "Read", "Check"…). Long Context / Definitions / Guarantees / Philosophy intros.

**Why expensive**: All preamble is paid every trigger even when the agent already knows the routine. The agent reads through "What this skill does" before reaching anything actionable.

**Fix**: Lead with action. Push background to `references/context.md`, kept available for first-time readers.

**Priority**:
- HIGH if preamble >50 lines.
- MEDIUM if 30–50 lines.
- LOW if 25–30 lines.

**Validation** (script-emitted): Almost always keep. The preamble line count is mechanical.

---

## Score formula

The preflight script computes a preliminary `Context efficiency` score 1–10:

```
score = 10
  − (eagerFootprint penalty × frequency multiplier)
  − descriptionBloat penalty
  − preambleLag penalty
floor 1, round to nearest int
```

**Eager footprint brackets** (eagerTotal = SKILL.md + description + eager refs, in tokens):

| Range | Penalty |
|---|---|
| > 25,000 | −4 |
| > 15,000 | −3 |
| > 8,000 | −2 |
| > 4,000 | −1 |
| > 2,000 | −0.5 |
| ≤ 2,000 | 0 |

**Frequency multiplier** (heuristic from description verbs):

| Tier | Multiplier | Description keywords |
|---|---|---|
| `rare` | ×0.5 | release, publish, deploy, scaffold, onboard, bootstrap, set up, migrate |
| `periodic` | ×0.75 | audit, review, report, digest, inventory, weekly, monthly |
| `regular` | ×1.0 | (default — per-task, per-commit usage) |

The agent should override the inferred tier in Phase 4 if context makes the actual cadence clearer (e.g. a "create" skill that actually fires every commit).

**Description bloat**: −1 if >150 words; −0.5 if 100–150 words.

**Preamble lag**: −0.5 if >30 lines before first imperative.

**Final adjustment** (agent applies after validating findings):

Start from `efficiencyScore.raw` (the unrounded preliminary score returned by the preflight). Then:

- −1 per validated HIGH (cap −5)
- −0.5 per validated MEDIUM (cap −2)
- LOW findings do not change the score

Floor the result at 1 and round to the nearest integer for the report. This appendix is the canonical source for the score formula — SKILL.md and `report-template.md` cite it rather than duplicating the rule.
