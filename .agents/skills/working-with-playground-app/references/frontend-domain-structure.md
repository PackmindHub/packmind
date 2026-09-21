# Frontend Domain Structure

The frontend app (`apps/frontend/src/`) organizes code by domain. Prototypes should mirror this structure when splitting components.

## Domain Folders

```
apps/frontend/src/domain/
├── accounts/
├── change-proposals/
├── deployments/
├── editions/
├── git/
├── llm/
├── organizations/
├── recipes/
├── rules/
├── setup/
├── skills/
├── spaces/
├── sse/
└── standards/
```

## Shared Folder

Cross-domain presentational components and utilities live in `apps/frontend/src/shared/`.

## Component Conventions

- Presentational components are reusable across domains
- Each domain folder groups components, hooks, and types related to that domain
- Prototypes should follow the same domain-based organization when splitting into multiple components
