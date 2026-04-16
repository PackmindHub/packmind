## Completion Summary (CLI 0.16.0)

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
  - Run `packmind-cli install [package-slug]` in other repos to distribute them
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
  packmind-cli standards create .packmind/standards/_drafts/<slug>.json
  packmind-cli packages add --to <package-slug> --standard <slug>
  packmind-cli commands create .packmind/commands/_drafts/<slug>.json
  packmind-cli packages add --to <package-slug> --command <slug>
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
  packmind-cli standards create <file>
============================================================
```
