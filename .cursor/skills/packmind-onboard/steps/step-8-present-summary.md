## Step 8 — Present Summary & Confirm

Present the generated draft files and ask for confirmation:

```
============================================================
  ANALYSIS COMPLETE
============================================================

Target package: [package-name]
Stack detected: [languages], [monorepo?], [architecture markers]
Analyses run: [N] checks

DRAFTS CREATED:

Standards ([N]):
  1. [Name] → .packmind/standards/_drafts/[slug].draft.md
  2. ...

Commands ([M]):
  1. [Name] → .packmind/commands/_drafts/[slug].draft.md
  2. ...

Drafts are saved in .packmind/*/_drafts/ — you can review or edit them before creating.
============================================================
```

Then ask via AskUserQuestion with three options:

- **Create all now** — Proceed with creating all standards and commands
- **Let me review drafts first** — Pause to allow editing, re-run skill when ready
- **Cancel** — Exit without creating anything
