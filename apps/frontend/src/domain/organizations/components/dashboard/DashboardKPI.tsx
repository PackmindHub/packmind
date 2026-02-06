import { useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMPageSection,
  PMStat,
  PMTooltip,
  PMButton,
} from '@packmind/ui';
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
  useGetSkillsDeploymentOverviewQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import { LuInfo, LuRadio } from 'react-icons/lu';
import { NonLiveArtifactsModal } from './NonLiveArtifactsModal';

export const DashboardKPI = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: recipesOverview } = useGetRecipesDeploymentOverviewQuery();
  const { data: standardsOverview } = useGetStandardsDeploymentOverviewQuery();
  const { data: skillsOverview } = useGetSkillsDeploymentOverviewQuery();

  const totalRecipes =
    recipesOverview?.recipes.filter((r) => !r.isDeleted).length ?? 0;
  const activeRecipes =
    recipesOverview?.recipes.filter(
      (r) => !r.isDeleted && r.targetDeployments.length > 0,
    ).length ?? 0;

  const totalStandards =
    standardsOverview?.standards.filter((s) => !s.isDeleted).length ?? 0;
  const activeStandards =
    standardsOverview?.standards.filter(
      (s) => !s.isDeleted && s.targetDeployments.length > 0,
    ).length ?? 0;

  const totalSkills =
    skillsOverview?.skills.filter((s) => !s.isDeleted).length ?? 0;
  const activeSkills =
    skillsOverview?.skills.filter(
      (s) => !s.isDeleted && s.targetDeployments.length > 0,
    ).length ?? 0;

  const totalNonLive =
    totalStandards -
    activeStandards +
    (totalRecipes - activeRecipes) +
    (totalSkills - activeSkills);

  return (
    <PMPageSection
      titleComponent={
        <PMHStack align="center" gap={2}>
          <PMIcon size="lg">
            <LuRadio></LuRadio>
          </PMIcon>
          Artifacts live{' '}
          <PMTooltip
            label={
              'Artifacts that are bundled into packages and distributed to at least one target repository. Only live artifacts are available to agents.'
            }
          >
            <PMBox display="inline-flex" cursor="help">
              <PMIcon as={LuInfo} />
            </PMBox>
          </PMTooltip>
        </PMHStack>
      }
      backgroundColor="primary"
      headingLevel="h5"
      cta={
        totalNonLive > 0 && (
          <PMButton
            variant="tertiary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            Show non-live artifacts ({totalNonLive})
          </PMButton>
        )
      }
    >
      <PMHStack align="stretch" width="full" gap={4} my={4}>
        <PMBox
          padding={4}
          borderRadius={'md'}
          flex={1}
          minW={0}
          border={'solid 1px'}
          borderColor={'border.tertiary'}
        >
          <PMStat.Root>
            <PMStat.Label>Standards</PMStat.Label>
            <PMStat.ValueText alignItems="baseline">
              {totalStandards === 0 ? (
                <PMStat.ValueUnit>No standards yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeStandards}{' '}
                  <PMStat.ValueUnit>/ {totalStandards} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
          </PMStat.Root>
        </PMBox>

        <PMBox
          padding={4}
          borderRadius={'md'}
          flex={1}
          minW={0}
          border={'solid 1px'}
          borderColor={'border.tertiary'}
        >
          <PMStat.Root>
            <PMStat.Label>Commands</PMStat.Label>
            <PMStat.ValueText alignItems="baseline">
              {totalRecipes === 0 ? (
                <PMStat.ValueUnit>No commands yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeRecipes}{' '}
                  <PMStat.ValueUnit>/ {totalRecipes} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
          </PMStat.Root>
        </PMBox>

        <PMBox
          padding={4}
          borderRadius={'md'}
          flex={1}
          minW={0}
          border={'solid 1px'}
          borderColor={'border.tertiary'}
        >
          <PMStat.Root>
            <PMStat.Label>Skills</PMStat.Label>
            <PMStat.ValueText alignItems="baseline">
              {totalSkills === 0 ? (
                <PMStat.ValueUnit>No skills yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeSkills}{' '}
                  <PMStat.ValueUnit>/ {totalSkills} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
          </PMStat.Root>
        </PMBox>
      </PMHStack>

      <NonLiveArtifactsModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </PMPageSection>
  );
};
