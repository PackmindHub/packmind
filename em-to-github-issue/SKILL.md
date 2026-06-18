---
name: 'em-to-github-issue'
description: 'Turn a user story from an Example Mapping Miro frame into a ready-to-develop GitHub issue. Reads the yellow user story, blue rules, green examples (transformed into Gherkin acceptance criteria) and red questions from the frame, prefers an existing curated EM spec when one is available locally, warns on unresolved questions, builds an English issue body with Definition-of-Done reminders (tests, lint, changelog, end-user docs, feature flag wiring when applicable, Amplitude events to track) tuned to the project''s trunk-based workflow, shows a preview, then publishes via `gh issue create` after explicit human confirmation. Use whenever a Miro EM frame URL is paired with intent to ship the story to developers — phrasing like "create the GitHub issue", "open the ticket", "publish this user story", "push to GitHub", "make the issue from this EM", or French equivalents ("crée l''issue", "publie la US", "fais le ticket", "envoie sur GitHub") all trigger it. Also trigger when the user pipes the output of `curate-em-workshop` toward GitHub or asks for "the dev-ready ticket" from a workshop.'
---

# EM to GitHub Issue

You turn the output of an Example Mapping workshop into a GitHub issue developers can pick up and ship. The Miro frame holds the team's thinking; the issue is the contract that crosses into the dev world. Your job is to lift the workshop into a clean, complete, action-oriented ticket — and to refuse to publish anything half-baked.

The issue body is always in **English**, even when the workshop and the conversation are in another language. Developers across the repo work in English in code and tickets; the workshop language stays on Miro.

## When this skill is in play

The user shares (or has already shared) a Miro frame URL pointing at an Example Mapping board, and signals intent to move the story toward implementation. Typical phrasings:

- "ok this US is ready, create the GitHub issue"
- "publish this user story to GitHub"
- "make the dev ticket from this frame"
- "crée l'issue GitHub pour cette US" / "publie cette user story sur GitHub" / "fais le ticket"
- "ship this workshop to dev"

If the user gave only a Miro board URL (no specific frame), call `mcp__miro__context_explore` first to list frames and ask which one to publish. Never guess.

If the user is mid-conversation with `curate-em-workshop` and the curation is approved, the natural next move is this skill. You can offer it proactively: "Want me to publish this as a GitHub issue?"

## Workflow

Five phases. Phase 4 (preview + confirmation) is a **hard human checkpoint** — do not call `gh issue create` until the user has explicitly approved the rendered body.

### Phase 1 — Locate the source material

The richest input is a **curated EM spec** produced by `curate-em-workshop`. The skill prefers it when available because it carries cleaned-up wording, named examples, scored criteria, and a clear separation between resolved and open questions. But you can only know whether a spec exists once you know the story slug — and that requires reading the frame first. So the order is: read Miro → derive slug → look for spec → decide.

1. Parse the Miro URL — extract the board ID and (if present) the `moveToWidget=` frame ID.
2. Read the Miro frame via `mcp__miro__board_list_items` (item_type `sticky_note`). Capture for each sticky: content, fill colour, position (x, y, width, height), and id. This is the single source-of-truth read — don't re-fetch later in this phase.
3. Identify the yellow user story (or `light_yellow` — Miro returns either depending on the team's sticky styling). Slugify its goal portion into kebab-case (e.g. "Apply loyalty discount at checkout" → `apply-loyalty-discount-at-checkout`).
4. Look under `tmp/em-curations/` at the project root for a file matching `{slug}-{YYYY-MM-DD}.md` (or a fuzzy slug match — workshops sometimes get titled slightly differently). If multiple dates exist, take the most recent.
5. **If a curated spec is found**, read it and use it as the primary source — the Miro read from step 2 becomes a sanity check (e.g. confirming sticky count hasn't changed since curation). Tell the user one line: "Using curated spec from `tmp/em-curations/{filename}` — this is richer than the raw frame."
6. **If no curated spec is found**, use the Miro data you already have. Tell the user: "No curated spec found for this frame. Working from raw stickies — issue quality will depend on the workshop's quality. Consider running `curate-em-workshop` first if the workshop wasn't curated."

When working from raw Miro data:

- Cluster green examples under the nearest blue rule using spatial proximity (same approach as `curate-em-workshop`).
- Detect **adjacent answer stickies** (see below) before classifying red stickies as open questions.
- Translate non-English sticky content into clean English when constructing the issue body — but flag in the preview that translation happened, so the user can correct any term that has a canonical form in code.

#### Detecting adjacent answer stickies

Teams routinely place a non-EM sticky (often violet, but any colour outside yellow/blue/green/red counts) next to a red question to record a proposed answer or decision the workshop reached. The standard EM palette doesn't model this — but missing it means treating already-discussed questions as if they were still open, which puts noise in the issue and erodes trust in the curation.

Detection rule, applied to each red sticky:

- Look for any sticky whose fill colour is **not** yellow / `light_yellow` / blue / `dark_blue` / green / `dark_green` / red.
- Pair it to the red sticky if it sits within roughly one sticky width (use the red sticky's `width` as the threshold) on the same row or directly adjacent on either side.
- When a pair is detected, treat the red sticky as a **proposed-answer question**: the workshop discussed it and parked a candidate disposition, but it hasn't been formally validated.

Render proposed-answer questions in the "Open questions to clarify" section with the candidate inline and flagged for confirmation: `*(proposed: {answer text} — confirm before starting)*`. Reds that have no adjacent answer sticky stay fully open.

In Phase 2, count proposed-answer questions as open for the purpose of the warning — they still warrant the user's decision — but mention in the prompt that {M} of {N} have proposed answers, so the user knows what they're choosing between.

### Phase 2 — Check for unresolved questions

Red stickies are the workshop's open questions. An issue is a "ready to develop" artefact; shipping it with unresolved questions means a developer will spin out as soon as they pick it up.

Detect open questions:

- **Curated spec source**: any item under `## 5. Questions (red)` → `### Still open` counts as open. Items under `### Resolved by curated examples` are fine — they're answered.
- **Raw Miro source**: every red sticky counts toward the "open" set, but separate them into two buckets using the adjacency detection from Phase 1:
  - **Fully open** — no adjacent answer sticky; the team hasn't discussed a candidate.
  - **Proposed answer** — adjacent non-EM sticky detected; the team parked a candidate but hasn't formally validated it.

If any open questions exist (in either bucket), **stop and ask the user** which path to take:

1. **Curate first** — back out and run `curate-em-workshop` (or a manual resolution session) on the frame. Recommended when the curation skill hasn't been run yet and many questions are fully open.
2. **Include as "Open questions to clarify"** — publish anyway, but surface the items as a dedicated section in the issue (with proposed answers inline when present) so the developer triggers a clarification round before starting. Use when the team consciously decided these questions are for the implementation phase.
3. **Promote proposed answers into the body, drop the rest** — for each proposed-answer question, treat the candidate as a decision and fold it into Technical hints or the relevant rule; ignore fully-open questions. Use when the team validated the candidates offline and you want a clean issue.
4. **Drop everything and publish clean** — the user takes full responsibility for the gap.

Wait for the user's pick. Default messaging (adapt counts and examples to the actual frame):

> {N} question(s) detected on the frame — {M} have a proposed answer, {N-M} are fully open:
>
> - "How do we do the linking?" _(proposed: Github App)_
> - "Refresh Git → background job?" _(proposed: Yes)_
> - "What happens to in-flight carts on price change?" _(fully open)_
>
> An issue should normally be free of open questions. How do you want to handle these?
>
> 1. Curate the frame first (recommended when many are fully open)
> 2. Include them in the issue as "Open questions to clarify" (with proposed answers inline)
> 3. Promote proposed answers into the body, drop the fully-open ones
> 4. Skip everything and publish clean

If no open questions exist, say one line ("No unresolved questions on this frame — good to go.") and continue.

### Phase 3 — Detect the target repository

The skill assumes the user is in the right working directory. Run `gh repo view --json nameWithOwner,defaultBranchRef -q .nameWithOwner` to confirm the target repo. If `gh` reports no repository (e.g. the cwd isn't a GitHub repo), tell the user and ask where the issue should go — never invent a repo.

Then ask three optional questions in **one** turn (use `AskUserQuestion` if available — multiSelect, low pressure):

- **Labels**: any labels to apply? List existing labels via `gh label list --limit 50` to give the user choices.
- **Assignees**: any assignee? Default: none.
- **Milestone**: milestone to attach? Default: none.

Keep all three optional — the issue is valid without them, and the user can always add them post-publication.

### Phase 4 — Build the body, preview, and wait for approval

Construct the issue body following the template below. Save it to `tmp/github-issues/{slug}-{YYYY-MM-DD}.md` (create the directory if missing) so the user has a local copy regardless of whether publication succeeds.

Then show the **full rendered body** in the conversation along with the proposed title, target repo, and metadata. Use this exact closing line (translate to the workshop's language if it isn't English):

> Here is the issue I will open against `{owner/repo}` — title, body, labels, assignees, milestone. Read it through and tell me what to adjust. I won't call `gh issue create` until you've approved.

Wait for explicit approval ("ok", "publish", "go", "ship it", "publie", "envoie"). If the user asks for changes, iterate on the body and present it again. Repeat until approved.

### Phase 5 — Publish via `gh`

Once approved, call:

```bash
gh issue create \
  --repo {owner/repo} \
  --title "{title}" \
  --body-file tmp/github-issues/{slug}-{YYYY-MM-DD}.md \
  --label "{label1}" --label "{label2}" \
  --assignee "{user}" \
  --milestone "{milestone}"
```

Use `--body-file` rather than `--body "..."` — it preserves multi-line formatting and avoids quoting hell. Pass `--label`, `--assignee`, `--milestone` only when set; omit the flag entirely otherwise (passing an empty string makes `gh` reject the call).

Report the resulting issue URL to the user. If the call fails (auth, missing label, etc.), surface the exact error and propose a fix — never silently retry with mutated inputs.

## Issue body template

The body is in English. Strip sticky ids from the rendered output — they belong in the Miro frame and (if applicable) the curated spec, not in the developer-facing ticket. Keep links so a developer can jump back to the workshop.

```markdown
## User story

As a **{persona}**,
I want **{capability}**,
so that **{outcome}**.

## Business value

{2–4 lines: why this matters now, what problem it solves, what changes for the user once shipped. Pull from the curated spec's "Agreed understanding" if available; otherwise infer from the yellow sticky and the rules.}

## Acceptance criteria

{One Gherkin scenario per green example, grouped under their blue rule. Use the example's title as the scenario name. Derive Given/When/Then from the example's content. Stay close to the team's wording — translate to English but don't paraphrase aggressively. If an example is too vague to Gherkinize, mark the scenario "(needs sharpening)" rather than inventing precision.}

### Rule: {curated rule wording}

**Scenario: {example title}**

- **Given** {precondition}
- **When** {action}
- **Then** {expected outcome}

**Scenario: {next example title}**

- …

### Rule: {next curated rule wording}

…

## Out of scope

{Bullet list of what is explicitly NOT in this ticket. Lift any "Out of scope" notes from the curated spec. If none, infer 2–3 anti-scope bullets from adjacent rules or product context, and mark them "(inferred — confirm)".}

## Technical hints

{Best-effort. Optional if there is nothing useful to say.}

- **Likely affected areas**: {packages, endpoints, components — from light grep over key nouns in the story}
- **Considerations**: {perf, security, edge cases the workshop touched on}

## Links

- Example Mapping (Miro): {miro_frame_url}
- Curated spec: `tmp/em-curations/{filename}` _(only when a curated spec was used)_

## Open questions to clarify

{Only present if Phase 2 path 2 was chosen. List each red sticky as a short question in plain English. For questions with a proposed answer detected on the frame, append the candidate inline so the developer knows what was discussed.}

- {fully-open question}
- {proposed-answer question} _(proposed: {answer} — confirm before starting)_

## Definition of Done

- [ ] Implementation matches the acceptance criteria above
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (where relevant)
- [ ] `nx lint` passes on edited projects
- [ ] `nx typecheck` / build passes on edited projects
- [ ] CHANGELOG updated under the Unreleased section
- [ ] End-user documentation updated under `apps/doc/` (only if user-facing)
- [ ] Feature flag wired in (only if the change is gated — name the flag, audience, and rollback plan)
- [ ] Amplitude events tracked (list each event name and the properties to capture; skip only if the change has no user-observable interaction)
```

The project uses **trunk-based development** — there is no PR-linking reminder. Work lands on `main` via small, self-contained commits referencing this issue.

### How to derive each section

**Title**: short, imperative, ≤70 chars. Take the _goal_ part of the user story ("I want X") and rewrite it as an action — e.g. story "As a buyer, I want to apply a loyalty discount at checkout, so that…" becomes title "Apply loyalty discount at checkout". Avoid trailing periods. Don't prefix with `[FEATURE]` or similar tags unless the repo's other issues do.

**User story block**: take the yellow sticky. If the workshop ran in French ("En tant que / Je veux / Pour"), translate to "As a / I want / so that". Preserve the persona's domain term (e.g. "tech lead", "Packmind admin") — don't generalise to "user".

**Acceptance criteria**: one Gherkin scenario per green example. Group scenarios under their rule using a `### Rule: …` heading. Don't omit a rule that has no green examples — render it with a placeholder scenario noting "(no concrete example — needs one before merge)". Better to expose the gap than to silently drop the rule.

**Open questions**: only render the section when Phase 2 path 2 was chosen. Don't include it as an empty placeholder otherwise.

**Definition of Done**: keep the checklist exactly as in the template — those reminders are the whole point of the skill for the team. If the user has additional repo-specific reminders they want by default, add them to the skill rather than baking them per-issue.

## Failure modes to watch for

- **Publishing with open questions**: never call `gh issue create` if the user didn't pick a path in Phase 2. The whole point of the warning is to keep half-baked stories out of the dev queue.
- **Inventing acceptance criteria the workshop didn't cover**: if a rule has no examples, expose the gap in the issue ("needs one before merge") rather than fabricating a scenario. Inventing scenarios = inventing requirements.
- **Skipping the preview**: Phase 4 is non-negotiable. Even when the user says "just publish it" upfront, render the body once and wait for approval. The cost of a wrong issue (developer confusion, public artefact, edit history) far exceeds the cost of one extra turn.
- **Posting non-English content**: even when the workshop is in French/Spanish/etc., the issue body is in English. Translate sticky content; flag any term you weren't sure how to translate so the user can correct it.
- **Hard-coding the repo**: the target repo comes from `gh repo view` in the cwd. Don't assume `packmind/packmind` or any specific repo — the skill should work for any project the user runs it in.
- **Quoting sticky ids in the issue**: `s001`, `s010` etc. belong in the curated Markdown for traceability with Miro. They have no place in the developer-facing ticket — they make the body noisier and have no meaning to the developer. Strip them.

## Iterating on an existing issue

If the user comes back saying "the issue I opened needs an update" with the same Miro frame:

- Look up the existing issue: ask the user for the number, or search by title via `gh issue list --search "{title}"`.
- Re-run Phases 1–3 to rebuild the body from the (possibly updated) frame or curated spec.
- Show the diff between the existing issue's body and the new body in the preview.
- On approval, call `gh issue edit {number} --body-file …` rather than creating a new issue.
