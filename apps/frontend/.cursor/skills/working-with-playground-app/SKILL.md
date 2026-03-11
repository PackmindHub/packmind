---
name: 'working-with-playground-app'
description: 'This skill provides guidance for building UI/UX prototypes in the Packmind playground app. It should be used when creating a new prototype, iterating on an existing prototype, or working with files in apps/playground/. Triggers on mentions of "playground", "prototype", or direct work within the apps/playground/ directory.'
---

# Working With the Playground App

## Overview

The playground app (`apps/playground/`) is a standalone Vite + React environment for iterating on UI/UX of Packmind features — both new and existing. Prototypes built here are meant to be easily convertible into production-ready code.

## Running the Playground

To start the playground dev server:

```bash
nx dev playground
```

The app runs on **localhost:4300**. It is not part of the Docker Compose setup — it runs in isolation via Vite's dev server.

## Creating a New Prototype

### 1. Create the Prototype Directory

Each prototype lives under `apps/playground/src/prototypes/`. For non-trivial prototypes, create a dedicated folder organized by domain — mirroring the frontend app structure. Consult `references/frontend-domain-structure.md` for the domain folder list.

```
apps/playground/src/prototypes/
├── index.ts                          # Prototype registry
├── ButtonsPrototype.tsx              # Simple single-file prototype
└── my-feature/                       # Multi-component prototype
    ├── MyFeaturePrototype.tsx        # Root component (entry point)
    ├── components/
    │   ├── domain-a/
    │   │   ├── SomeComponent.tsx
    │   │   └── AnotherComponent.tsx
    │   └── domain-b/
    │       └── SomethingElse.tsx
    └── types.ts                      # Shared types for this prototype
```

For simple prototypes (e.g., showcasing a single component), a single file is acceptable.

### 2. Build the Prototype Component

Create a default-exported React component:

```tsx
import { PMBox, PMHeading } from '@packmind/ui';

export default function MyFeaturePrototype() {
  return (
    <PMBox padding="6">
      <PMHeading size="lg">My Feature</PMHeading>
      {/* Prototype content */}
    </PMBox>
  );
}
```

### 3. Register the Prototype

Add the prototype to `apps/playground/src/prototypes/index.ts`:

```tsx
import MyFeaturePrototype from './my-feature/MyFeaturePrototype';

export const prototypes: Prototype[] = [
  // ... existing prototypes
  {
    name: 'My Feature',
    description: 'Optional description',
    component: MyFeaturePrototype,
  },
];
```

The prototype will appear in the dropdown selector in the playground nav bar.

## Mandatory Rules

### Data

- **Always use stub/mock data.** Never make actual calls to the backend. Define realistic mock data inline or in a dedicated `data.ts` file within the prototype folder.

### Dependencies

- **Never install new dependencies** without explicit user approval.
- **Never modify files outside `apps/playground/`.** No changes to other apps or packages.

### Reusing Existing Code

- Prototypes **can** import presentational components and types from the frontend app (`apps/frontend/src/`) and shared type packages (`packages/`).
- Prototypes **must not** import services, gateways, hooks with side effects, or anything that calls the backend.

### UI Components

- Use `PM*` components from `@packmind/ui` (e.g., `PMBox`, `PMButton`, `PMHeading`, `PMVStack`, `PMHStack`, `PMText`).
- When a needed component is not available in the Packmind UI kit, browse [Chakra UI v3 components](https://www.chakra-ui.com/docs/components) for reference, then map to the corresponding `PM*` wrapper before using. If no wrapper exists, ask the user before using the raw Chakra component.
- Icons come from `react-icons/lu` (Lucide icons, prefixed with `Lu`).

### Code Quality

- Prototypes **must** be production-ready in structure. Follow React best practices: split responsibility, create as many components as needed, organize by domain.
- Use `useState`, `useCallback`, `useMemo` for local state and performance.
- Define TypeScript types for all data structures.
- Keep components focused — each component should have a single responsibility.

## Resources

### references/

- `frontend-domain-structure.md` — Domain folder structure from the frontend app, to guide component organization in prototypes.