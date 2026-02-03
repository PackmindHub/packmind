# Design: `packmind-cli packages create` Command

**Date**: 2026-02-02
**Status**: Ready for implementation

## Overview

A CLI command to create a Packmind package—a logical collection of standards, commands, and skills that can be distributed together. The command creates the package in the web app only (no local files).

## Command Interface

### Basic Usage (name only)

```bash
packmind-cli packages create FrontEnd
```

### With Description (typically used by AI agents)

```bash
packmind-cli packages create BackEnd --description="Mon super package backend"
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<name>` | Positional | Yes | Package name |
| `--description` | Flag | No | Package description |

## Input Requirements

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | Non-empty, 3-100 chars, alphanumeric + hyphens/underscores |
| Description | No | Optional, can be added later in the web app |

Organization context is handled by the existing authentication system.

## Slug Generation & Collision Handling

The slug is auto-generated from the name (e.g., "FrontEnd" → "frontend").

**If the slug already exists** in the organization, auto-increment with a suffix:
- `frontend` exists → create `frontend-2`
- `frontend-2` exists → create `frontend-3`
- etc.

No error is thrown for name collisions—the system handles it automatically.

## Success Output

```
Created: frontend
You can see it at: https://app.packmind.com/packages/frontend
You can install it with: packmind-cli packages install frontend
```

Simple, actionable output with:
- The created slug
- Link to view/edit in the web app
- Command to install the package

## Error Handling

| Error | User Message |
|-------|--------------|
| Validation failed | Specific field error (e.g., "Name must be at least 3 characters") |
| Network error | "Unable to connect to Packmind. Check your connection and try again." |
| Authentication error | "Not authenticated. Run `packmind-cli login` first." |
| API error | Surface the API error message |

Note: Slug collision is NOT an error—it's handled via auto-increment.

## API Integration

- **Authentication**: Uses existing CLI API client
- **Endpoint**: POST `/api/packages` (or equivalent existing endpoint)
- **Request payload**: `{ name, description? }`
- **Response**: Package object with `id`, `slug`, `name`, `description`, timestamps
- **Slug collision**: Handled server-side with auto-increment

## Local Files

**None**. The package exists only in the web app.

## Implementation

### File Location

`apps/cli/src/commands/packages/create.ts` (following existing CLI structure)

### Steps

1. Create command handler for `packages create <name>` with optional `--description` flag
2. Add input validation logic (name format and length)
3. Integrate with package API endpoint via existing API client
4. Format and display success output
5. Add error handling for validation, network, and auth errors
6. Write tests

### Testing Strategy

- Unit tests for validation logic
- Integration tests mocking the API client
- Test with and without description
- Test error scenarios (validation errors, network errors, auth errors)

## Use Cases

### Human user in terminal

```bash
$ packmind-cli packages create FrontEnd
Created: frontend
You can see it at: https://app.packmind.com/packages/frontend
You can install it with: packmind-cli packages install frontend
```

### AI agent creating a package

User says: "Crée moi le package BackEnd"

Agent runs:
```bash
packmind-cli packages create BackEnd --description="Standards et patterns pour le backend"
```

### Slug collision

```bash
$ packmind-cli packages create FrontEnd
Created: frontend-2
You can see it at: https://app.packmind.com/packages/frontend-2
You can install it with: packmind-cli packages install frontend-2
```

## Future Work

- `packmind-cli packages list` - List available packages
- Commands to add standards/commands/skills to packages
