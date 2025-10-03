import { PMBox, PMHStack, PMStat } from '@packmind/ui';
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';

export const DashboardKPI = () => {
  const { data: recipesOverview } = useGetRecipesDeploymentOverviewQuery();
  const { data: standardsOverview } = useGetStandardsDeploymentOverviewQuery();

  const activeRecipes =
    recipesOverview?.recipes.filter((r) => r.targetDeployments.length > 0)
      .length ?? 0;

  const activeStandards =
    standardsOverview?.standards.filter((s) => s.targetDeployments.length > 0)
      .length ?? 0;

  return (
    <PMHStack align="stretch" width="full" gap={4}>
      <PMBox
        backgroundColor={'background.primary'}
        padding={4}
        borderRadius={'md'}
        flex={1}
        minW={0}
      >
        <PMStat.Root>
          <PMStat.Label>Active standards</PMStat.Label>
          <PMStat.ValueText>{activeStandards}</PMStat.ValueText>
        </PMStat.Root>
      </PMBox>

      <PMBox
        backgroundColor={'background.primary'}
        padding={4}
        borderRadius={'md'}
        flex={1}
        minW={0}
      >
        <PMStat.Root>
          <PMStat.Label>Active recipes</PMStat.Label>
          <PMStat.ValueText>{activeRecipes}</PMStat.ValueText>
        </PMStat.Root>
      </PMBox>
    </PMHStack>
  );
};
