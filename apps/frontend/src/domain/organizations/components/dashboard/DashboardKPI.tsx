import {
  PMBox,
  PMHStack,
  PMStat,
  isFeatureFlagEnabled,
  DEFAULT_FEATURE_DOMAIN_MAP,
  MANAGE_SKILLS_FEATURE_KEY,
} from '@packmind/ui';
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
  useGetSkillsDeploymentOverviewQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import { useAuthContext } from '../../../accounts/hooks';

export const DashboardKPI = () => {
  const { organization, user } = useAuthContext();
  const { data: recipesOverview } = useGetRecipesDeploymentOverviewQuery();
  const { data: standardsOverview } = useGetStandardsDeploymentOverviewQuery();
  const { data: skillsOverview } = useGetSkillsDeploymentOverviewQuery();

  const showSkills = isFeatureFlagEnabled({
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    featureKeys: [MANAGE_SKILLS_FEATURE_KEY],
    userEmail: user?.email,
  });

  const activeRecipes =
    recipesOverview?.recipes.filter((r) => r.targetDeployments.length > 0)
      .length ?? 0;

  const activeStandards =
    standardsOverview?.standards.filter((s) => s.targetDeployments.length > 0)
      .length ?? 0;

  const activeSkills =
    skillsOverview?.skills.filter((s) => s.targetDeployments.length > 0)
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
          <PMStat.Label>Standards distributed</PMStat.Label>
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
          <PMStat.Label>Commands distributed</PMStat.Label>
          <PMStat.ValueText>{activeRecipes}</PMStat.ValueText>
        </PMStat.Root>
      </PMBox>

      {showSkills && (
        <PMBox
          backgroundColor={'background.primary'}
          padding={4}
          borderRadius={'md'}
          flex={1}
          minW={0}
        >
          <PMStat.Root>
            <PMStat.Label>Skills distributed</PMStat.Label>
            <PMStat.ValueText>{activeSkills}</PMStat.ValueText>
          </PMStat.Root>
        </PMBox>
      )}
    </PMHStack>
  );
};
