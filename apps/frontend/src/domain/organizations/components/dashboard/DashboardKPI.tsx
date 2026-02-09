import { useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMPageSection,
  PMStat,
  PMTooltip,
  PMButton,
  PMProgress,
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

  const getBackgroundColorByPercentage = (
    active: number,
    total: number,
  ): string => {
    if (total === 0) return 'transparent';
    const percentage = (active / total) * 100;
    if (percentage === 100) return 'green.1000';
    if (percentage === 0) return 'orange.1000';
    return 'beige.1000';
  };

  const getBorderColorByPercentage = (
    active: number,
    total: number,
  ): string => {
    if (total === 0) return 'border.tertiary';
    const percentage = (active / total) * 100;
    if (percentage === 100) return 'green.700';
    if (percentage === 0) return 'orange.700';
    return 'beige.700';
  };

  const getTextColorByPercentage = (active: number, total: number): string => {
    if (total === 0) return 'text.primary';
    const percentage = (active / total) * 100;
    if (percentage === 100) return 'green.400';
    if (percentage === 0) return 'orange.400';
    return 'beige.0';
  };

  const standardsBackgroundColor = getBackgroundColorByPercentage(
    activeStandards,
    totalStandards,
  );
  const standardsBorderColor = getBorderColorByPercentage(
    activeStandards,
    totalStandards,
  );
  const standardsTextColor = getTextColorByPercentage(
    activeStandards,
    totalStandards,
  );
  const recipesBackgroundColor = getBackgroundColorByPercentage(
    activeRecipes,
    totalRecipes,
  );
  const recipesBorderColor = getBorderColorByPercentage(
    activeRecipes,
    totalRecipes,
  );
  const recipesTextColor = getTextColorByPercentage(
    activeRecipes,
    totalRecipes,
  );
  const skillsBackgroundColor = getBackgroundColorByPercentage(
    activeSkills,
    totalSkills,
  );
  const skillsBorderColor = getBorderColorByPercentage(
    activeSkills,
    totalSkills,
  );
  const skillsTextColor = getTextColorByPercentage(activeSkills, totalSkills);

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
              'Only live artifacts can be used by agents. Add those artifacts to a package and distribute it.'
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
            {totalNonLive} non-live
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
          backgroundColor={standardsBackgroundColor}
          border={'solid 1px'}
          borderColor={standardsBorderColor}
        >
          <PMStat.Root size={'lg'}>
            <PMStat.Label color={'text.primary'}>Standards</PMStat.Label>
            <PMStat.ValueText alignItems="baseline" color={standardsTextColor}>
              {totalStandards === 0 ? (
                <PMStat.ValueUnit>No standards yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeStandards}{' '}
                  <PMStat.ValueUnit>/ {totalStandards} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
            {totalStandards > 0 && (
              <PMProgress.Root
                value={(activeStandards / totalStandards) * 100}
                colorPalette={
                  totalStandards === activeStandards
                    ? 'green'
                    : activeStandards === 0
                      ? 'orange'
                      : 'blue'
                }
                size="xs"
                mt={2}
              >
                <PMProgress.Track>
                  <PMProgress.Range />
                </PMProgress.Track>
              </PMProgress.Root>
            )}
          </PMStat.Root>
        </PMBox>

        <PMBox
          padding={4}
          borderRadius={'md'}
          flex={1}
          minW={0}
          backgroundColor={recipesBackgroundColor}
          border={'solid 1px'}
          borderColor={recipesBorderColor}
        >
          <PMStat.Root size={'lg'}>
            <PMStat.Label color={'text.primary'}>Commands</PMStat.Label>
            <PMStat.ValueText alignItems="baseline" color={recipesTextColor}>
              {totalRecipes === 0 ? (
                <PMStat.ValueUnit>No commands yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeRecipes}{' '}
                  <PMStat.ValueUnit>/ {totalRecipes} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
            {totalRecipes > 0 && (
              <PMProgress.Root
                value={(activeRecipes / totalRecipes) * 100}
                colorPalette={
                  totalRecipes === activeRecipes
                    ? 'green'
                    : activeRecipes === 0
                      ? 'orange'
                      : 'blue'
                }
                size="xs"
                mt={2}
              >
                <PMProgress.Track>
                  <PMProgress.Range />
                </PMProgress.Track>
              </PMProgress.Root>
            )}
          </PMStat.Root>
        </PMBox>

        <PMBox
          padding={4}
          borderRadius={'md'}
          flex={1}
          minW={0}
          backgroundColor={skillsBackgroundColor}
          border={'solid 1px'}
          borderColor={skillsBorderColor}
        >
          <PMStat.Root size={'lg'}>
            <PMStat.Label color={'text.primary'}>Skills</PMStat.Label>
            <PMStat.ValueText alignItems="baseline" color={skillsTextColor}>
              {totalSkills === 0 ? (
                <PMStat.ValueUnit>No skills yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeSkills}{' '}
                  <PMStat.ValueUnit>/ {totalSkills} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
            {totalSkills > 0 && (
              <PMProgress.Root
                value={(activeSkills / totalSkills) * 100}
                colorPalette={
                  totalSkills === activeSkills
                    ? 'green'
                    : activeSkills === 0
                      ? 'orange'
                      : 'blue'
                }
                size="xs"
                mt={2}
              >
                <PMProgress.Track>
                  <PMProgress.Range />
                </PMProgress.Track>
              </PMProgress.Root>
            )}
          </PMStat.Root>
        </PMBox>
      </PMHStack>

      <NonLiveArtifactsModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </PMPageSection>
  );
};
