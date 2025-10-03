import { NavLink } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import { RecipeUsageAnalytics } from '@packmind/proprietary/frontend/domain/analytics/components/RecipeUsageAnalytics';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/analytics`}>Analytics</NavLink>;
  },
};

export default function AnalyticsIndexRouteModule() {
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
