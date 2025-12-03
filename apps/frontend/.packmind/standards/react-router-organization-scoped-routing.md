# React Router Organization-Scoped Routing

When building organization-centric React applications with React Router, all routes that display or manage organization-specific data must follow a consistent URL structure and authentication pattern to ensure secure access control and intuitive navigation. This standard applies to file-based routing in React Router applications where users belong to specific organizations and need to access organization-scoped features. It ensures consistent organization validation, proper redirects, and maintainable routing patterns across the application.

## Rules

* Use the file naming convention org.$orgSlug._protected.{feature}._index.tsx for all organization-scoped routes
* Extract orgSlug from route params using useParams() hook
* Implement authentication checks using useAuthContext before rendering content
* Redirect unauthenticated users to /org/${orgSlug}/sign-in or /get-started
* Validate that the URL orgSlug matches the authenticated user's organization slug
* Redirect users to their correct organization URL when slug mismatch is detected using navigate with replace: true
* Return null during loading states or when authentication/organization validation is pending
* Use PMPage component with organization-aware breadcrumbs that include organization name and slug
* Pass React Router's Link component to PMPage via LinkComponent prop for client-side navigation
* Implement the handle.crumb pattern for dynamic breadcrumb generation in nested routes
