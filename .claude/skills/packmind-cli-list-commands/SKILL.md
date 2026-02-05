---
name: packmind-cli-list-commands
description: 'Reference for Packmind CLI listing commands. This skill should be used when an agent needs to discover available standards, commands, or skills in the Packmind organization.'
license: 'Complete terms in LICENSE.txt'
---

# Packmind CLI List Commands

List available Packmind artifacts (standards, commands, skills, packages) via the CLI.

## IMPORTANT: Output Requirements

When presenting results to the user, you MUST:

1. **Run the CLI command** using the Bash tool
2. **Preserve the full URLs** from the CLI output - these are clickable links to the Packmind webapp
3. **Display results as a list** showing slug, name, and the full URL for each item
4. **Never summarize or table-ify** the output in a way that hides the URLs

Example output format to show the user:

```
## Standards (3)

- **my-standard-slug**
  Name: My Standard Name
  Link: https://app.packmind.com/org/myorg/space/global/standards/abc123/summary

- **another-standard**
  Name: Another Standard
  Link: https://app.packmind.com/org/myorg/space/global/standards/def456/summary
```

## Commands Reference

| Command                       | Purpose                 |
| ----------------------------- | ----------------------- |
| `packmind-cli standards list` | List coding standards   |
| `packmind-cli commands list`  | List reusable commands  |
| `packmind-cli skills list`    | List available skills   |
| `packmind-cli install --list` | List available packages |

## Prerequisites

Ensure packmind-cli is authenticated before running commands:

```bash
packmind-cli whoami
```

If not logged in, authenticate first:

```bash
packmind-cli login
```
