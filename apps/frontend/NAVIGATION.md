# Navigation Service Guide

This guide explains how to use Packmind's type-safe navigation utilities for routing between pages.

## Overview

Packmind uses a two-level navigation system:

- **Organization-scoped routes**: Pages that belong to an organization (e.g., dashboard, settings, analytics)
- **Space-scoped routes**: Pages that belong to a specific space within an organization (e.g., recipes, standards)

## Navigation Utilities

### 1. `useNavigation()` Hook

Use this hook for programmatic navigation (e.g., in event handlers, after form submissions).

```tsx
import { useNavigation } from '../../shared/hooks/useNavigation';

function MyComponent() {
  const nav = useNavigation();

  const handleClick = () => {
    // Navigate to organization-scoped pages
    nav.org.toDashboard();
    nav.org.toSettings();
    nav.org.toDeployments();
    nav.org.toAnalytics();

    // Navigate to space-scoped pages
    nav.space.toRecipes();
    nav.space.toStandards();
    nav.space.toStandard(standardId);
    nav.space.toRecipe(recipeId);

    // Navigate to auth pages
    nav.auth.toSignIn();
    nav.auth.toSignUp();

    // Generic navigation
    nav.to('/custom/path');
    nav.toWithOptions('/path', { replace: true, state: { from: 'somewhere' } });
  };

  // Check if navigation is ready (org + space available)
  if (!nav.isReady) {
    return <Spinner />;
  }

  return <button onClick={handleClick}>Navigate</button>;
}
```

**Key Features:**

- Automatically pulls `orgSlug` and `spaceSlug` from current route or context
- Type-safe methods for all routes
- No need to manually construct URLs
- Handles missing slugs gracefully

### 2. `routes` Utility

Use this for declarative navigation (e.g., in `<Link>` components or when you need URLs as strings).

```tsx
import { routes } from '../../shared/utils/routes';
import { Link } from 'react-router';

function MyComponent() {
  const orgSlug = 'my-org';
  const spaceSlug = 'my-space';
  const standardId = 'std-123';

  return (
    <div>
      {/* Organization-scoped links */}
      <Link to={routes.org.toDashboard(orgSlug)}>Dashboard</Link>
      <Link to={routes.org.toSettings(orgSlug)}>Settings</Link>
      <Link to={routes.org.toDeployments(orgSlug)}>Deployments</Link>

      {/* Space-scoped links */}
      <Link to={routes.space.toRecipes(orgSlug, spaceSlug)}>Recipes</Link>
      <Link to={routes.space.toStandards(orgSlug, spaceSlug)}>Standards</Link>
      <Link to={routes.space.toStandard(orgSlug, spaceSlug, standardId)}>
        View Standard
      </Link>

      {/* Auth links */}
      <Link to={routes.auth.toSignIn()}>Sign In</Link>
    </div>
  );
}
```

**Key Features:**

- Returns URL strings for use in `Link` components
- Type-safe - TypeScript will catch missing parameters
- Centralized route definitions
- Easy to refactor routes globally

## When to Use Which?

| Scenario                                  | Use                               |
| ----------------------------------------- | --------------------------------- |
| Programmatic navigation in event handlers | `useNavigation()` hook            |
| `<Link>` components                       | `routes` utility                  |
| Need automatic slug resolution            | `useNavigation()` hook            |
| Need explicit slug control                | `routes` utility                  |
| Navigation with options (replace, state)  | `useNavigation().toWithOptions()` |

## Available Routes

### Organization-Scoped (nav.org / routes.org)

- `toDashboard(orgSlug)`
- `toDeployments(orgSlug)`
- `toAnalytics(orgSlug)`
- `toSettings(orgSlug)`
- `toSettingsUsers(orgSlug)`
- `toSettingsGit(orgSlug)`
- `toSettingsTargets(orgSlug)`
- `toSettingsDistribution(orgSlug)`
- `toAccountSettings(orgSlug)`

### Space-Scoped (nav.space / routes.space)

- `toRecipes(orgSlug, spaceSlug)`
- `toRecipe(orgSlug, spaceSlug, recipeId)`
- `toStandards(orgSlug, spaceSlug)`
- `toStandard(orgSlug, spaceSlug, standardId)`
- `toStandardRules(orgSlug, spaceSlug, standardId)`
- `toStandardEdit(orgSlug, spaceSlug, standardId)`
- `toCreateStandard(orgSlug, spaceSlug)`

### Auth Routes (nav.auth / routes.auth)

- `toSignIn()`
- `toSignUp()`
- `toForgotPassword()`
- `toResetPassword(token?)`
- `toActivate(token)`

## Examples

### Example 1: Form Submission

```tsx
import { useNavigation } from '../../shared/hooks/useNavigation';

function CreateStandardForm() {
  const nav = useNavigation();

  const handleSubmit = async (data) => {
    const newStandard = await createStandard(data);
    // Navigate to the newly created standard
    nav.space.toStandard(newStandard.id);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Example 2: Conditional Navigation

```tsx
import { useNavigation } from '../../shared/hooks/useNavigation';

function LoginButton() {
  const nav = useNavigation();
  const { isAuthenticated } = useAuthContext();

  const handleClick = () => {
    if (isAuthenticated) {
      nav.org.toDashboard();
    } else {
      nav.auth.toSignIn();
    }
  };

  return <button onClick={handleClick}>Continue</button>;
}
```

### Example 3: Breadcrumb Navigation

```tsx
import { routes } from '../../shared/utils/routes';
import { useParams } from 'react-router';

function Breadcrumbs() {
  const { orgSlug, spaceSlug } = useParams();

  return (
    <nav>
      <Link to={routes.org.toDashboard(orgSlug)}>Home</Link>
      <Link to={routes.space.toStandards(orgSlug, spaceSlug)}>Standards</Link>
      <span>Current Page</span>
    </nav>
  );
}
```

## Best Practices

1. **Always use the navigation utilities** - Never manually construct URLs like `/org/${orgSlug}/...`
2. **Use `useNavigation()` for event handlers** - It automatically gets slugs from context
3. **Use `routes` for Link components** - When you have slugs available in scope
4. **Check `nav.isReady`** - Before rendering navigation-dependent UI
5. **Handle missing slugs** - `routes` functions return `'#'` when slugs are undefined

## Migration Guide

**Before:**

```tsx
navigate(`/org/${orgSlug}/space/${spaceSlug}/recipes`);
<Link to={`/org/${orgSlug}/settings`}>Settings</Link>;
```

**After:**

```tsx
nav.space.toRecipes();
<Link to={routes.org.toSettings(orgSlug)}>Settings</Link>;
```

## Adding New Routes

When adding a new route, update both utilities:

1. Add to `useNavigation()` hook in `src/shared/hooks/useNavigation.ts`
2. Add to `routes` utility in `src/shared/utils/routes.ts`
3. Update this documentation

Example:

```typescript
// In useNavigation.ts
space: {
  toMyNewPage: () => {
    if (!currentOrgSlug || !currentSpaceSlug) return;
    navigate(`/org/${currentOrgSlug}/space/${currentSpaceSlug}/my-new-page`);
  },
}

// In routes.ts
space: {
  toMyNewPage: (orgSlug: string, spaceSlug: string) =>
    `/org/${orgSlug}/space/${spaceSlug}/my-new-page`,
}
```
