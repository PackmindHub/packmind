# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Frontend Data Flow](./standards/frontend-data-flow.md) : Standardize frontend route data flow using React Router v7 framework mode with TanStack Query by centralizing fetching in route clientLoaders via queryClient.ensureQueryData(), organizing reusable query options/hooks under apps/frontend/src/domain/{entity}/api/queries/, and consuming results with useLoaderData() to reduce intermediate loading states and improve consistency and reuse.
- [Frontend Error Management](./standards/frontend-error-management.md) : Establish frontend error management for apps/frontend/**/*.tsx that prescribes when to add React error boundaries beyond the global root.tsx fallback and how to handle errors they don't catch—such as event handlers, async code, SSR, or errors thrown in the boundary—by using TypeScript-typed guards (e.g., isPackmindError), try/catch for async operations, TanStack Query onError callbacks and mutation-pending checks to prevent double submissions, inline validation for expected API/user errors, and selective page- or component-level boundaries for isolated third-party widgets like CodeMirror, to reduce complexity, improve UX, and keep error flows maintainable in React/TypeScript projects built with Node.js and typical tooling (Vite/Webpack, ESLint/Prettier) and tested with Jest/Cypress.
- [Frontend Navigation with React Router](./standards/frontend-navigation-with-react-router.md) : Standardize frontend navigation using React Router v7 with centralized utilities in React applications to ensure consistent URL parameter handling and simplify navigation management, particularly when organizing and scoping URLs, across apps/frontend/**/*.tsx.
- [TanStack Query Key Management](./standards/tanstack-query-key-management.md) : Standardize TanStack Query query key definitions in per-domain api/queryKeys.ts files using const base key arrays, separate scope constants, and operation enums with hierarchical organization→domain→operation→identifiers ordering to enable type-safe prefix-based cache invalidation without circular dependencies and to ensure mutations invalidate all affected sibling scopes.


---

*This standards index was automatically generated from deployed standard versions.*