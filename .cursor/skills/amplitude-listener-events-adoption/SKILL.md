---
name: 'amplitude-listener-events-adoption'
description: 'Report organization adoption in Amplitude for the most recently added domain events in the AmplitudeEventListener. Walks git history on `packages/amplitude/src/application/AmplitudeEventListener.ts` to find the last 15 still-subscribed events, queries the Packmind V3 [CLOUD] Amplitude project via the MCP, and produces a markdown report grouped by domain prefix (text before the first underscore). Triggers when the user asks to audit recent amplitude listener events, check which orgs use new domain events, measure adoption of recently added events, or requests an amplitude report on space/playbook/standard/etc. events.'
---

# Amplitude Listener Events Adoption

Produce a markdown adoption report for the **last 15 domain events** subscribed in the Amplitude listener, grouped by domain, listing organizations that triggered each event and how many times.

## Prerequisites

- The Amplitude MCP must be connected (tools prefixed `mcp__amplitude__`). If not, prompt the user to run `/mcp`.
- Target project: **Packmind V3 [CLOUD]**, `appId = 100032310`. Never query the DEV or legacy projects unless the user explicitly asks.

## Inputs

| Parameter | Default | Description |
|-----------|---------|-------------|
| `N` | 15 | Number of most-recently-added events to report on |
| `range` | `Last 30 Days` | Amplitude date range |
| Excluded orgs | see below | Defaults applied automatically; user may extend the list |
| Excluded events | see below | Defaults applied automatically; user may extend the list |

## Organizations exclusion

Always exclude these internal/test organizations from the report (apply **after** querying Amplitude, before aggregation):

- `AI Configuration orga`
- `test_package_standards`
- `packmind`
- `Joan's orga`
- `demo-orga`
- `VIncent test`
- `cedric.teyton's organization`
- `cedric-test`
- `test-skills`

Match on the exact organization `grp:name` value returned by Amplitude. Extend this list if the user provides additional orgs to skip.

## Events exclusion

Always exclude these Amplitude event names from the report even if they are among the last N subscribed in the listener:

- `user_signed_in`
- `new_organization_created`
- `user_signed_up`

Rationale: these three events fire once per user/organization creation and produce extreme long tails (hundreds of orgs with a single event each), drowning out the actual feature-adoption signal the report is built for.

Drop excluded events from the event-name list **before** building the Amplitude query (do not count them toward `N` — select the next most recent event to fill the quota). Extend this list if the user provides additional events to skip.

## Workflow

### Step 1 — Identify the last N still-subscribed events

Source file: `packages/amplitude/src/application/AmplitudeEventListener.ts`.

1. Read the current file and collect the set of event **class names** that appear in `this.subscribe(<Event>, ...)` inside `registerHandlers()`. This is the "still-subscribed" set.
2. For each class, also extract the corresponding **Amplitude event name** (the string literal passed as the 2nd argument to `this.emitAmplitudeEvent(event, '<name>', ...)` in the handler). This is what Amplitude stores.
3. Walk the file's git history newest→oldest:

   ```bash
   git log --all --follow --format="%h|%ai|%s" -- packages/amplitude/src/application/AmplitudeEventListener.ts
   ```

4. For each commit, extract added `this.subscribe(` lines:

   ```bash
   git show --format="" <commit> -- packages/amplitude/src/application/AmplitudeEventListener.ts \
     | grep -E "^\+ *this\.subscribe\("
   ```

5. Walk commits in order; for every added class name that is also in the still-subscribed set, record `(amplitude_event_name, class_name, commit_date, commit_sha)` once (deduplicate by class — only keep the **most recent** addition). Stop once `N` unique events are collected.
6. Discard entries for events that were later removed or renamed out of the current file (e.g. `SpaceRenamedEvent` → filtered because no longer in the current `registerHandlers`).

Multi-line `this.subscribe(\n  EventName,\n  ...)` must also be captured — widen the grep context (`grep -A2`) when a line ends just after `this.subscribe(`.

**Efficient commit walk**: rather than running `git show` once per commit interactively, batch the first ~40 commits returned by `git log` and loop in a single `bash` call:

```bash
for c in $(git log --all --follow --format="%h" -- packages/amplitude/src/application/AmplitudeEventListener.ts | head -40); do
  echo "=== $c ==="
  git show --format="" $c -- packages/amplitude/src/application/AmplitudeEventListener.ts \
    | grep -E "^\+ *this\.subscribe\(" -A1
done
```

This surfaces all added `this.subscribe(` lines with commit boundaries in one tool call, which keeps token cost low and preserves the newest→oldest ordering needed for dedupe.

### Step 2 — Query Amplitude

Use `mcp__amplitude__query_dataset` with:

- `projectId`: `"100032310"`
- `definition`:
  ```json
  {
    "type": "eventsSegmentation",
    "app": "100032310",
    "params": {
      "range": "Last 30 Days",
      "events": [ /* one entry per amplitude event name */
        { "event_type": "<name>", "filters": [], "group_by": [] }
      ],
      "metric": "totals",
      "countGroup": "organization",
      "groupBy": [{ "type": "group", "group_type": "organization", "value": "grp:name" }],
      "interval": 30,
      "segments": [{ "conditions": [] }]
    }
  }
  ```
- `groupByLimit`: `200`
- `timeSeriesLimit`: `0`

**Critical gotcha**: the CSV returned by `query_dataset` *omits* the organization name column when `groupBy` is set on a group property. Re-query using `mcp__amplitude__query_chart` with the `chartEditId` returned by `query_dataset`; that response includes the real org-name column. Always do this second call to get usable data.

If the response payload is large, rely on `timeSeriesLimit: 0` (totals-only) to keep it compact.

### Step 3 — Aggregate and format

Parse the CSV rows from `query_chart`. The response contains header rows (chart name, list of events), an empty separator row, and then a data section starting with a `["Event", "name", "<interval-label-1>", "<interval-label-2>", ...]` row followed by data rows.

- **Row shape with `timeSeriesLimit: 0`**: each data row is `[event_name, org_name, <interval_1_count>, <interval_2_count>, ...]`. There is **no trailing grand-total column** in that mode — sum the interval columns yourself to get the per-org total for the window. A 30-day range typically yields two interval columns (one per calendar month touched).
- **Ignore blank or placeholder org rows**: rows with `org_name == ""` or `org_name == "(none)"` represent events fired outside any organization context and must be skipped.

Aggregation is mechanical and repetitive across 10+ events — use a small inline Python script via `Bash` with `python3 -` or a heredoc to load the parsed rows, apply the exclusion list, sum intervals, sort, and slice top-10 + `+K`. Doing this by hand for long tails (e.g. `standard_sample_selected` with 60+ orgs) is error-prone and wastes tokens.

- Group events by **domain prefix** = substring before the first underscore in the Amplitude event name (`space_created` → `space`, `playbook_artefact_moved` → `playbook`, `change_proposal_submitted` → `change`, etc.).
- Inside each domain, list events in the order they appear in the source file (stable for the reader).
- Apply the **org exclusion list** before totaling. If no orgs remain for an event, treat it as zero-orgs.
- For each event:
  1. Start the line with the total number of **distinct organizations** that triggered it (after exclusions): `- <event> (N orgs): ...`.
  2. Sort organizations by their event count, descending; list at most the **top 10** with their counts: `orgA (42), orgB (18), ...`.
  3. If more than 10 orgs remain, append a trailing `+K` token where `K` = remaining org count. Example: `- space_created (23 orgs): orgA (9), orgB (7), ... orgJ (2) +13`. Never enumerate those remaining orgs by name; the `+K` is a trend signal only.
- **Collapse zero-adoption events into a single summary line** at the end of each domain (or at the end of the full report if the user prefers global grouping): `- No adoption (0 orgs): event_a, event_b, event_c`.

### Step 4 — Emit the report

Write the report to `amplitude-listener-events-adoption.md` at the project root (overwrite if it already exists). Also display the highlights inline in the chat reply so the user can scan them without opening the file.

Skeleton:

```markdown
# Amplitude adoption — last N listener events (Packmind V3 [CLOUD], <range>)

Excluded orgs: <list>. Excluded events: <list>.

## Domain: space
- space_created (23 orgs): orgA (9), orgB (7), orgC (6), orgD (5), orgE (4), orgF (3), orgG (3), orgH (2), orgI (2), orgJ (2) +13
- space_members_added (4 orgs): orgA (18), orgB (12), orgC (5), orgD (1)
- ...
- No adoption (0 orgs): space_pinned, space_unpinned

## Domain: playbook
- playbook_artefact_moved (2 orgs): orgA (40), orgC (4)

...

Source chart: [Open in Amplitude](<chartEditUrl>)
```

Keep the report concise — no per-month breakdown, no narrative paragraphs. The user wants a scan-friendly list.

## Edge cases

- **Fewer than N events in history**: report whatever is available and note the shortfall in one line.
- **Event renamed in listener but kept in Amplitude** (e.g. renaming `user_signup` → `user_signed_up`): trust the current file; query only the current Amplitude event name.
- **Event subscribed in listener but never emitted in prod**: it will appear as a zero-adoption event — that is the correct signal.
- **Duplicate commits touching the same subscribe line** (merges, reverts): keep the most recent non-reverted addition.
- **Group property is empty or placeholder** (`""` or `"(none)"` org name row): ignore that row — the event fired outside any org context.
- **Event also tracked with an identify call** (e.g. `OrganizationCreatedEvent` triggers `identifyOrganizationGroup` in addition to the tracked event): this does not affect the adoption query but explains why some org names appear populated only after the event fires once.
- **All remaining orgs are in the exclusion list**: emit the event under the `No adoption (0 orgs): …` summary line — do not emit a misleading `(N orgs)` header when the real external count is zero.