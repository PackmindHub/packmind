---
applyTo: 'apps/frontend/**/*.tsx'
---
# Standard: Frontend Error Management

A global error boundary is already configured at the root level (in root.tsx) that automatically catches all page crashes, 404s, and loader failures. This standard defines when and how to use explicit... :
* Avoid overusing error boundaries as they increase code complexity and make error flows harder to trace
* Display validation errors inline near the relevant form fields for better user experience
* Do NOT use error boundaries for errors that should be handled explicitly such as form validation, expected API errors, and user input errors
* Handle TanStack Query mutation errors using onError callbacks to display contextual error messages
* Only add a page-level error boundary when you need custom error UI for a specific route that differs from the default error page
* Only add component-level error boundaries for isolated critical features where partial failure is acceptable, such as independent dashboard widgets that can fail without affecting the rest of the page. Use this mainly when using components we do not manage internally (eg: CodeMirror).
* Prevent double submissions by checking mutation pending state before triggering operations
* Use typed error guards such as isPackmindError to safely extract error details from API responses before displaying to users
* Wrap async operations in try-catch blocks since error boundaries do NOT catch errors in event handlers or async code

Full standard is available here for further request: [Frontend Error Management](../../.packmind/standards/frontend-error-management.md)