## Select Existing Package (CLI 0.23.0)

Determine the space of the selected package:

```bash
packmind-cli spaces list
```

- **Single space**: use it directly — set `$SPACE_SLUG` to its slug, no user prompt needed.
- **Multiple spaces**: ask the user via AskUserQuestion which space the selected package belongs to, then set `$SPACE_SLUG` to the chosen slug.
