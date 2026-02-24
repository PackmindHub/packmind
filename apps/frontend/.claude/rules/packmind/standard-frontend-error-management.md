---
name: 'Frontend Error Management'
paths: apps/frontend/**/*.tsx
alwaysApply: false
description: "Establish frontend error management for apps/frontend/**/*.tsx that prescribes when to add React error boundaries beyond the global root.tsx fallback and how to handle errors they don't catch—such as event handlers, async code, SSR, or errors thrown in the boundary—by using TypeScript-typed guards (e.g., isPackmindError), try/catch for async operations, TanStack Query onError callbacks and mutation-pending checks to prevent double submissions, inline validation for expected API/user errors, and selective page- or component-level boundaries for isolated third-party widgets like CodeMirror, to reduce complexity, improve UX, and keep error flows maintainable in React/TypeScript projects built with Node.js and typical tooling (Vite/Webpack, ESLint/Prettier) and tested with Jest/Cypress."
---

## Standard: Frontend Error Management

Establish frontend error management for apps/frontend/\*_/_.tsx that prescribes when to add React error boundaries beyond the global root.tsx fallback and how to handle errors they don't catch—such as event handlers, async code, SSR, or errors thrown in the boundary—by using TypeScript-typed guards (e.g., isPackmindError), try/catch for async operations, TanStack Query onError callbacks and mutation-pending checks to prevent double submissions, inline validation for expected API/user errors, and selective page- or component-level boundaries for isolated third-party widgets like CodeMirror, to reduce complexity, improve UX, and keep error flows maintainable in React/TypeScript projects built with Node.js and typical tooling (Vite/Webpack, ESLint/Prettier) and tested with Jest/Cypress. :

- Avoid overusing error boundaries as they increase code complexity and make error flows harder to trace
- Display validation errors inline near the relevant form fields for better user experience
- Do NOT use error boundaries for errors that should be handled explicitly such as form validation, expected API errors, and user input errors
- Handle TanStack Query mutation errors using onError callbacks to display contextual error messages
- Only add a page-level error boundary when you need custom error UI for a specific route that differs from the default error page
- Only add component-level error boundaries for isolated critical features where partial failure is acceptable, such as independent dashboard widgets that can fail without affecting the rest of the page. Use this mainly when using components we do not manage internally (eg: CodeMirror).
- Prevent double submissions by checking mutation pending state before triggering operations
- Use typed error guards such as isPackmindError to safely extract error details from API responses before displaying to users
- Wrap async operations in try-catch blocks since error boundaries do NOT catch errors in event handlers or async code

Full standard is available here for further request: [Frontend Error Management](../../../.packmind/standards/frontend-error-management.md)
