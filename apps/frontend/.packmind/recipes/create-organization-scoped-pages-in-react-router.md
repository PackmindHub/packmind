Create organization-scoped pages in a React Router application to enhance navigation and user experience by ensuring secure access to relevant data for each organization.

## When to Use

- When transforming standalone pages into organization-scoped routes
- When implementing organization-level access control for features
- When you need to validate user access based on organization membership
- When adding new features that should be scoped to specific organizations

## Context Validation Checkpoints

* [ ] Does your application have an existing authentication system with organization context?
* [ ] Are you using React Router with file-based routing?
* [ ] Do you have a UI component library that supports breadcrumbs?
* [ ] Is there an organization context or hook available (e.g., useAuthContext)?

## Recipe Steps

### Step 1: Create Organization-Scoped Route File

Create a new route file following React Router naming convention: apps/frontend/app/routes/org.$orgSlug.{feature}._index.tsx. Include authentication checks using useAuthContext and redirect logic to validate organization access.

```typescript
// apps/frontend/app/routes/org.$orgSlug.feature._index.tsx
import { useParams, useNavigate, Link } from 'react-router';
import { useEffect } from 'react';
import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';

export default function OrgFeatureIndex() {
  const { orgSlug } = useParams();
  const { isAuthenticated, isLoading, organization } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/get-started');
      return;
    }
    if (!isLoading && isAuthenticated && organization && orgSlug !== organization.slug) {
      navigate(`/org/${organization.slug}/feature`, { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, navigate]);

  if (isLoading || !isAuthenticated || !organization || orgSlug !== organization.slug) {
    return null;
  }

  return (
    <PMPage
      title="Feature"
      subtitle="Feature description"
      breadcrumbs={[
        { label: organization.name, href: `/org/${organization.slug}` },
        { label: 'Feature', isCurrentPage: true },
      ]}
      LinkComponent={Link}
    >
      {/* Your content */}
    </PMPage>
  );
}
```

### Step 2: Update Components for Organization Context

Add organization props (orgSlug, orgName) to components that need to navigate or display organization-specific content. Use these props to construct proper navigation paths and breadcrumbs.

```typescript
interface ComponentProps {
  id: string;
  orgSlug?: string;
  orgName?: string;
}

export const Component = ({ id, orgSlug, orgName }: ComponentProps) => {
  const navigate = useNavigate();
  
  const handleNavigation = () => {
    navigate(orgSlug ? `/org/${orgSlug}/feature` : '/feature');
  };

  return (
    <PMPage
      breadcrumbs={[
        { label: orgName || 'Home', href: orgSlug ? `/org/${orgSlug}` : '/' },
        { label: 'Feature', href: orgSlug ? `/org/${orgSlug}/feature` : '/feature' },
        { label: 'Current', isCurrentPage: true },
      ]}
      LinkComponent={Link}
    >
      {/* Content */}
    </PMPage>
  );
};
```

### Step 3: Fix Breadcrumb Navigation for React Router

Update the UI package PMPage component to support React Router's Link component. Add a LinkComponent prop that accepts a React Router Link and use it for breadcrumb navigation to enable client-side routing without page reloads.

```typescript
// packages/ui/.../PMPage.tsx
export interface IPMPageProps {
  // ... existing props
  LinkComponent?: React.ComponentType<{
    to: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }>;
}

// In breadcrumb rendering:
{breadcrumb.href && !breadcrumb.isCurrentPage && LinkComponent ? (
  <LinkComponent to={breadcrumb.href}>
    <Text color="gray.600" fontSize="sm" textDecoration="underline">
      {breadcrumb.label}
    </Text>
  </LinkComponent>
) : (
  <Text as={breadcrumb.href && !breadcrumb.isCurrentPage ? 'a' : 'span'}>
    {breadcrumb.label}
  </Text>
)}
```

### Step 4: Add Header Navigation

Update the header component to include navigation buttons for organization-scoped features, using the organization context to construct proper URLs.

```typescript
// ConnectedHeader.tsx
const actions = (
  <HStack gap={2}>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => navigate(organization ? `/org/${organization.slug}/feature` : '/feature')}
    >
      Feature
    </Button>
  </HStack>
);
```

### Step 5: Update Organization Home Page

Add navigation to the new feature from the organization home page, ensuring users can discover and access the organization-scoped functionality.

### Step 6: Clean Up Old Routes

Remove standalone route files that have been replaced by organization-scoped routes to avoid confusion and maintain a single source of truth for navigation.

### Step 7: Run Validation Steps

Run linting with nx run-many -t lint, execute tests with nx run-many -t test, and manually test navigation to ensure breadcrumb clicks don't reload the page, authentication redirects work correctly, organization context is respected, and header navigation functions properly.
