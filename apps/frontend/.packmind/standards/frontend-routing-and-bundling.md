# Frontend Routing and Bundling

This standard ensures that React Router v7 routes are correctly bundled using Vite's manual chunk configuration to optimize bundle sizes and loading performance. It defines how to group related routes into shared bundles for optimal code splitting.

## Rules

* Configure manual chunks in Vite's rollupOptions.output.manualChunks to group related routes into shared bundles for optimal code splitting
* Group public authentication routes (app/routes/_public) into a routes-public-auth chunk
* Group organization analytics, deployments, and account settings routes into a routes-org-analytics chunk
* Group organization settings routes (app/routes/org.$orgSlug._protected.settings) into a routes-org-settings chunk
* Group organization artifacts (dashboard, recipes, and standards routes) into a routes-org-artifacts chunk
* Use path matching with id.includes() to identify route files for chunk grouping in the manual chunks function
