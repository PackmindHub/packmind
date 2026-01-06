---
name: Frontend Routing and Bundling
globs: apps/frontend/vite.config.ts
alwaysApply: false
description: Configure frontend routing and bundling to ensure React Router v7 routes are correctly grouped and bundled via Vite's rollupOptions.output.manualChunks in apps/frontend/vite.config.ts using id.includes() path matching to emit named chunks (routes-public-auth, routes-org-analytics, routes-org-settings, routes-org-artifacts) for public auth, org analytics/deployments/account settings, org settings, and artifacts to optimize code splitting, minimize bundle sizes, and improve loading performance in TypeScript React applications.
---

## Standard: Frontend Routing and Bundling

Configure frontend routing and bundling to ensure React Router v7 routes are correctly grouped and bundled via Vite's rollupOptions.output.manualChunks in apps/frontend/vite.config.ts using id.includes() path matching to emit named chunks (routes-public-auth, routes-org-analytics, routes-org-settings, routes-org-artifacts) for public auth, org analytics/deployments/account settings, org settings, and artifacts to optimize code splitting, minimize bundle sizes, and improve loading performance in TypeScript React applications. :

- Configure manual chunks in Vite's rollupOptions.output.manualChunks to group related routes into shared bundles for optimal code splitting
- Group organization analytics, deployments, and account settings routes into a routes-org-analytics chunk
- Group organization artifacts (dashboard, recipes, and standards routes) into a routes-org-artifacts chunk
- Group organization settings routes (app/routes/org.$orgSlug.\_protected.settings) into a routes-org-settings chunk
- Group public authentication routes (app/routes/\_public) into a routes-public-auth chunk
- Use path matching with id.includes() to identify route files for chunk grouping in the manual chunks function

Full standard is available here for further request: [Frontend Routing and Bundling](../../../.packmind/standards/frontend-routing-and-bundling.md)
