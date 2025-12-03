# Frontend Navigation with React Router

This codebase uses React Router v7 with organization and space scoping in URLs (e.g., /org/{orgSlug}/space/{spaceSlug}/recipes). To maintain consistency, improve maintainability, and simplify navigation management across the application, all internal navigation must use centralized utilities instead of manual URL construction. This approach ensures that URL parameter handling (orgSlug, spaceSlug) is abstracted away and reduces the risk of broken links when routes change.

## Rules

* Omit orgSlug and spaceSlug parameters to use current organization and space context by default and only specify them explicitly when navigating to a different organization or space.
* Use authentication route methods (routes.auth.*) for authentication-related navigation.
* Use organization-scoped route methods (routes.org.*) for pages that require only organization context.
* Use space-scoped route methods (routes.space.*) for pages that require both organization and space context.
* Use the routes utility from shared/utils/routes for all declarative navigation with Link and NavLink components.
* Use the useNavigation() hook from shared/hooks/useNavigation for all programmatic navigation with navigate().
