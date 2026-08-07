## Completion Summary (CLI 0.23.0)

### All items created successfully

```
============================================================
  ✅ ONBOARDING COMPLETE
============================================================

Package: [package-name]
Created: [N] standards, [M] commands

Your standards and commands have been created and deployed locally.

Next steps:
  - Reload your AI coding assistant to start using them
  - Visit [host from packmind-cli whoami] to manage your standards and commands
  - Run `packmind-cli install @$SPACE_SLUG/[package-slug]` in other repos to distribute them
============================================================
```

Clean up successful draft files after creation.

### Partial success (some items failed)

```
============================================================
  ⚠️ ONBOARDING COMPLETED WITH ERRORS
============================================================

Package: [package-name]
Created: [N] standards, [M] commands
Failed: [X] items

Failed items:
  • [item-name]: [error message]

Failed drafts remain in .packmind/*/_drafts/ for review.
You can fix and re-run, or create manually with:
  cp .packmind/standards/_drafts/<slug>.draft.md .packmind/standards/_drafts/<slug>.md
  packmind-cli playbook add --space <space-slug> .packmind/standards/_drafts/<slug>.md
  cp .packmind/commands/_drafts/<slug>.draft.md .packmind/commands/_drafts/<slug>.md
  packmind-cli playbook add --space <space-slug> .packmind/commands/_drafts/<slug>.md
  packmind-cli playbook submit --no-review
  packmind-cli packages add --to @<space-slug>/<package-slug> --standard <slug>
  packmind-cli packages add --to @<space-slug>/<package-slug> --command <slug>
============================================================
```

Keep failed draft files for user to fix and retry.

### No patterns discovered

If analysis found no patterns:

```
============================================================
  ℹ️ NO PATTERNS DISCOVERED
============================================================

The analysis didn't find enough recurring patterns to generate standards or commands.

This can happen with smaller codebases or projects with very diverse coding styles.
You can try again later as the codebase grows, or create standards manually with:
  cp .packmind/standards/_drafts/<slug>.draft.md .packmind/standards/_drafts/<slug>.md
  packmind-cli playbook add --space <space-slug> .packmind/standards/_drafts/<slug>.md
  packmind-cli playbook submit --no-review
============================================================
```
