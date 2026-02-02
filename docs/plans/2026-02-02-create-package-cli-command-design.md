# Design: `packmind create-package` CLI Command

**Date**: 2026-02-02
**Status**: Ready for implementation

## Overview

A CLI command to create a Packmind package—a logical collection of standards, commands, and skills that can be distributed together. The command creates the package in the web app only (no local files).

## Command Interface

### Interactive Mode

```bash
packmind create-package
```

Prompts the user for:
1. Package name
2. Description

### Flag Mode

```bash
packmind create-package --name "My Package" --description "A collection of API standards"
```

Accepts name and description as flags, skipping prompts entirely.

Both modes produce the same output on success.

## Input Requirements

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | Non-empty, 3-100 chars, alphanumeric + hyphens/underscores |
| Description | Yes | Non-empty |

Name uniqueness is validated via API before creation.

## API Integration

- **Authentication**: Uses existing CLI API client (no new auth system)
- **Endpoint**: POST `/api/packages` (or equivalent existing endpoint)
- **Request payload**: `{ name, description }`
- **Response**: Package object with `id`, `slug`, `name`, `description`, timestamps

## Success Output

```
✓ Package created: My Package
  Slug: my-package
  ID: abc123def456

Next steps:
  • Add standards: packmind add-standard --package my-package
  • Add commands: packmind add-command --package my-package
  • Add skills: packmind add-skill --package my-package

View and edit in the app:
  https://app.packmind.com/packages/my-package
```

## Error Handling

| Error | User Message |
|-------|--------------|
| Name already exists | "A package with this name already exists. Try a different name." |
| Validation failed | Specific field error (e.g., "Name must be at least 3 characters") |
| Network error | "Unable to connect to Packmind. Check your connection and try again." |
| API error | Surface the API error message |

## Local Files

**None**. The package exists only in the web app. Users add entities to packages using separate commands:
- `packmind add-standard --package <slug>`
- `packmind add-command --package <slug>`
- `packmind add-skill --package <slug>`

## Implementation

### File Location

`packages/cli/src/commands/create-package.ts`

### Steps

1. Create command handler supporting both interactive and flag modes
2. Add input validation logic
3. Integrate with package API endpoint via existing API client
4. Format and display success output with app link
5. Add error handling for each failure case
6. Write tests covering: interactive mode, flag mode, validation errors, API errors

### Testing Strategy

- Unit tests for validation logic
- Integration tests mocking the API client
- Test both interactive and flag modes
- Test error scenarios (duplicate name, network errors, etc.)

## Future Work

Separate commands to add entities to packages:
- `packmind add-standard`
- `packmind add-command`
- `packmind add-skill`

These commands will reference packages by slug.
