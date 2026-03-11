---
name: 'working-with-playground-app'
description: 'This skill provides guidance for building UI/UX prototypes in the Packmind playground app. It should be used when creating a new prototype, iterating on an existing prototype, or working with files in apps/playground/. Triggers on mentions of "playground", "prototype", or direct work within the apps/playground/ directory.'
---

# Working With the Playground App

## Overview

The playground app (`apps/playground/`) is a standalone Vite + React environment for iterating on UI/UX of Packmind features — both new and existing. Prototypes built here are meant to be easily convertible into production-ready code.

## UX Design Thinking

Before writing any code, think like a UX designer. The playground exists to explore how a feature *feels* to use — not just how it looks. Apply these principles to every prototype:

### Design All States First

Never prototype only the happy path. Before building, identify and plan for every state the user might encounter:

- **Empty state** — What does the user see before any data exists? Guide them toward the first action.
- **Loading state** — What appears while data is being fetched? Use skeletons or spinners to set expectations.
- **Populated state** — The standard view with data. Test with both minimal and full datasets.
- **Error state** — What happens when something fails? Show a clear message and a recovery path.
- **Edge cases** — What about a single item? Hundreds? An extremely long name that might overflow?

Prototype each state explicitly — use local state toggles or tabs to let reviewers switch between them.

### Use Realistic, Varied Data

Mock data should stress-test the design, not just fill space:

- Include **long names** that could wrap or overflow, **short names** that could look sparse, and **special characters**.
- Vary counts: 0 items, 1 item, a handful, and many (50+). Layouts that work for 5 items often break at 50.
- Include **missing optional fields** — not every record will be complete.
- Use **recognizable but realistic** content so reviewers can evaluate readability, not just layout.

### Design for Interaction

Prototypes should be clickable and stateful, not static mockups:

- Wire up buttons, toggles, and form inputs with local state so reviewers experience the flow.
- Simulate async operations (e.g., a brief delay before showing a success toast) to prototype timing and feedback.
- Show what happens *after* an action — does a list update? Does a confirmation appear? Does the user navigate somewhere?

### Establish Visual Hierarchy

Guide the user's eye to what matters most:

- **One primary action per view.** If everything is bold, nothing is. Use a primary button for the main action, secondary/ghost for the rest.
- **Group related information** with spacing and borders, not just proximity.
- **Size and weight signal importance.** Headings, subheadings, and body text should create a clear reading order.
- **Use whitespace deliberately** — it separates sections and reduces cognitive load.

### Make Affordance Obvious

Users should understand what they can do without instructions:

- **Clickable elements should look clickable.** Buttons look like buttons, links look like links.
- **Destructive actions should look dangerous** — use red/warning styling and require confirmation.
- **Disabled states should be visually distinct** and ideally explain *why* they're disabled (tooltip or helper text).
- **Feedback should be immediate** — hover states, active states, and loading indicators tell the user the system responded.

### Manage Information Density

Show enough to be useful, hide enough to avoid overwhelm:

- **Lead with a summary, offer detail on demand.** Use accordions, expandable rows, or drill-down views for secondary information.
- **Don't front-load every field.** Tables and lists should show the most important 3–5 columns; offer a detail view for the rest.
- **Use progressive disclosure** — reveal complexity as the user engages deeper (overview → detail → advanced settings).

### Stay Consistent With the Product

Before designing something new, check how the existing product handles similar patterns:

- **Browse `apps/frontend/src/domain/`** for existing feature implementations. If a similar interaction exists, match its layout and behavior before inventing alternatives.
- **Reuse established patterns** — if the product uses a sidebar + main content layout for listings, don't prototype a card grid for the same type of data without good reason.
- **Follow the same information architecture** — similar actions in the same position, similar data in the same format.
- When diverging from existing patterns, call it out explicitly so reviewers can evaluate the change intentionally.

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