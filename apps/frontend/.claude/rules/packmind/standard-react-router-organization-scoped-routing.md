---
name: React Router Organization-Scoped Routing
alwaysApply: true
description: Establish consistent organization-scoped routing patterns in React Router applications with proper authentication, URL validation, and navigation patterns.
---

## Standard: React Router Organization-Scoped Routing

Establish consistent organization-scoped routing patterns in React Router applications with proper authentication, URL validation, and navigation patterns. :

- Extract orgSlug from route params using useParams() hook
- Implement authentication checks using useAuthContext before rendering content
- Implement the handle.crumb pattern for dynamic breadcrumb generation in nested routes
- Pass React Router's Link component to PMPage via LinkComponent prop for client-side navigation
- Redirect unauthenticated users to /org/${orgSlug}/sign-in or /get-started
- Redirect users to their correct organization URL when slug mismatch is detected using navigate with replace: true
- Return null during loading states or when authentication/organization validation is pending
- Use PMPage component with organization-aware breadcrumbs that include organization name and slug
- Use the file naming convention org.$orgSlug.\_protected.{feature}.\_index.tsx for all organization-scoped routes
- Validate that the URL orgSlug matches the authenticated user's organization slug

Full standard is available here for further request: [React Router Organization-Scoped Routing](../../../.packmind/standards/react-router-organization-scoped-routing.md)
