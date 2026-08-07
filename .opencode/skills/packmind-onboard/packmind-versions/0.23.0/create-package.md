## Create Package (CLI 0.23.0)

### Select a space

List available spaces:

```bash
packmind-cli spaces list
```

- **Multiple spaces**: ask the user which space to use via AskUserQuestion, then remember the chosen slug as `<space-slug>`.
- **Single space**: use it directly — no user prompt needed.

### Create the package

```bash
packmind-cli packages create "<package-name>" --space <space-slug>
```
