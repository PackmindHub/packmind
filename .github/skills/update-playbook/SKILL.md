---
name: 'update-playbook'
description: 'This skill should be used when the user wants to evaluate and update the Packmind playbook (standards, commands, skills) based on the current conversation context. Triggers on requests like "update the playbook", "sync standards", "check if we need new standards", or after significant coding sessions where patterns emerged.'
---

# Update Playbook

Evaluate the current conversation context against existing Packmind artifacts (standards, commands, skills) to identify what needs creating, updating, or deprecating. Produce a structured change report, then apply approved changes.

## Process

### Phase 1: Context Summary

Before dispatching any subagents, summarize the current conversation context. Extract:
- What was built or changed
- What patterns emerged or were established
- What decisions were made and why
- What mistakes were corrected
- What problems were solved

This summary is reused as input for all subsequent subagent prompts.

### Phase 2: Triage (parallel, shallow)

Find which existing artifacts are relevant to the session. Read each `references/triage-*.md` file and construct one prompt per subagent:

```
## Conversation Context

<the context summary from Phase 1>

## Triage Task

<full contents of the corresponding references/triage-*.md file>
```

Launch all three as `Task(general-purpose)` subagents in a single message:

| Subagent | Reference File | Output |
|----------|---------------|--------|
| Standards Triage | `references/triage-standards.md` | List of relevant standard slugs + new standard ideas |
| Commands Triage | `references/triage-commands.md` | List of relevant command slugs + new command ideas |
| Skills Triage | `references/triage-skills.md` | List of relevant skill names + new skill ideas |

Each subagent returns a short list — no deep analysis, just relevance filtering.

### Phase 3: Deep Analysis (parallel, focused)

Using the triage results, read each `references/analyse-*.md` file and construct one prompt per subagent. Include only the artifacts flagged as relevant by triage:

```
## Conversation Context

<the context summary from Phase 1>

## Relevant Artifacts

<the filtered list from the corresponding triage subagent>

## Analysis Task

<full contents of the corresponding references/analyse-*.md file>
```

Launch all three as `Task(general-purpose)` subagents in a single message:

| Subagent | Reference File | Output |
|----------|---------------|--------|
| Standards Analyst | `references/analyse-standards.md` | Detailed change report |
| Commands Analyst | `references/analyse-commands.md` | Detailed change report |
| Skills Analyst | `references/analyse-skills.md` | Detailed change report |

Skip a subagent entirely if its triage returned no relevant artifacts and no new artifact ideas.

### Phase 4: Consolidated Report

After all analysis subagents complete, consolidate their reports into a single change report presented to the user. **Number every change sequentially** so the user can selectively approve (e.g., "apply 1, 3, 5" or "all but 4"):

```
## Playbook Change Report

### Skill Updates (keep current)
1. [skill] <name>: <what changed and why>

### New Skills
2. [skill] <name>: <reason>

### Standard Updates
3. [standard] <name>: <what changed and why>

### New Standards (lintable rules only)
4. [standard] <name>: <reason>

### Command Updates (strong evidence only)
5. [command] <name>: <what changed and why>

### Deprecations
6. [standard|skill] <name>: <reason>

### No Changes Needed
- [standards|commands|skills]: <brief explanation if an artifact type needs no changes>
```

**Ordering reflects priority**: skill accuracy first, then standards, then commands. New commands are never proposed (command creation is user-driven).

Present this report and ask the user which changes to apply. Accept any of:
- **All**: apply every numbered change
- **Inclusion list**: "1, 3, 5" or "only 2 and 6"
- **Exclusion list**: "all but 4" or "everything except 2, 7"

Map the user's selection back to the specific artifact changes before proceeding to Phase 5.

### Phase 5: Apply Changes

For each approved change from the Phase 4 report, edit the local installed files directly:

- **Standards**: `.packmind/standards/<slug>.md`
- **Commands**: `.packmind/commands/<slug>.md`
- **Skills**: `.claude/skills/<skill-name>/` (SKILL.md, references/, etc.)

Edit only one instance of each artifact — `packmind diff` compares the local copy against the server version.

For **new** artifacts, delegate to the corresponding creation skill (`packmind-create-standard`, `packmind-create-command`, `packmind-create-skill`).

#### Step 1: Preview

Run `packmind diff` and present the output to the user. Verify the diff matches the intended changes — no unrelated modifications should be included.

If unrelated changes appear in the diff (e.g., from a previous session), inform the user and proceed only with the intended changes.

#### Step 2: Submit

Run `packmind diff --submit -m "<concise summary of all changes>"` to submit the changes as proposals for human review on Packmind.

#### Step 3: Propagate

Ask the user whether they have validated the submitted changes on Packmind and wish to propagate them locally. If yes, run:

```bash
packmind install --recursive
```

## Reference Files

| File | Phase | Contents |
|------|-------|----------|
| `references/triage-standards.md` | 2 | Shallow relevance scan for standards |
| `references/triage-commands.md` | 2 | Shallow relevance scan for commands |
| `references/triage-skills.md` | 2 | Shallow relevance scan for skills |
| `references/analyse-standards.md` | 3 | Deep analysis of pre-filtered standards |
| `references/analyse-commands.md` | 3 | Deep analysis of pre-filtered commands |
| `references/analyse-skills.md` | 3 | Deep analysis of pre-filtered skills |