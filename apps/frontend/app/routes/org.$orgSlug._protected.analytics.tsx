import { useParams, NavLink } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RecipeUsageAnalytics } from '@packmind/proprietary/frontend/domain/analytics/components/RecipeUsageAnalytics';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/analytics`}>Analytics</NavLink>;
  },
};

export default function AnalyticsIndexRouteModule() {
  const { orgSlug } = useParams();
  const { isAuthenticated, organization } = useAuthContext();

  // If not authenticated, return null (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If org slug doesn't match, return null (redirect will happen in useEffect)
  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  return (
    <PMPage
      title="Analytics"
      subtitle="Recipe usage analytics and insights"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <RecipeUsageAnalytics />
      </PMVStack>
    </PMPage>
  );
}
