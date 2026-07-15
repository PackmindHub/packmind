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
import { useGetDashboardKpiQuery } from '../../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { LuInfo, LuRadio } from 'react-icons/lu';
import { NonLiveArtifactsDrawer, ArtifactTab } from './NonLiveArtifactsDrawer';

export const DashboardKPI = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ArtifactTab>('standards');
  const { spaceId } = useCurrentSpace();

  const openModalOnTab = (tab: ArtifactTab) => {
    setSelectedTab(tab);
    setIsModalOpen(true);
  };
  const { data: kpi } = useGetDashboardKpiQuery(spaceId ?? '');

  const totalStandards = kpi?.standards.total ?? 0;
  const activeStandards = kpi?.standards.active ?? 0;
  const totalCommands = kpi?.commands.total ?? 0;
  const activeCommands = kpi?.commands.active ?? 0;
  const totalSkills = kpi?.skills.total ?? 0;
  const activeSkills = kpi?.skills.active ?? 0;

  const nonLiveStandards = totalStandards - activeStandards;
  const nonLiveCommands = totalCommands - activeCommands;
  const nonLiveSkills = totalSkills - activeSkills;

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
  const commandsBackgroundColor = getBackgroundColorByPercentage(
    activeCommands,
    totalCommands,
  );
  const commandsBorderColor = getBorderColorByPercentage(
    activeCommands,
    totalCommands,
  );
  const commandsTextColor = getTextColorByPercentage(
    activeCommands,
    totalCommands,
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
            <PMHStack justify="space-between" align="center" width="full">
              <PMStat.Label color={'text.primary'}>Standards</PMStat.Label>
              {nonLiveStandards > 0 && (
                <PMButton
                  variant="tertiary"
                  size="xs"
                  onClick={() => openModalOnTab('standards')}
                >
                  {nonLiveStandards} non-live
                </PMButton>
              )}
            </PMHStack>
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
          backgroundColor={commandsBackgroundColor}
          border={'solid 1px'}
          borderColor={commandsBorderColor}
        >
          <PMStat.Root size={'lg'}>
            <PMHStack justify="space-between" align="center" width="full">
              <PMStat.Label color={'text.primary'}>Commands</PMStat.Label>
              {nonLiveCommands > 0 && (
                <PMButton
                  variant="tertiary"
                  size="xs"
                  onClick={() => openModalOnTab('commands')}
                >
                  {nonLiveCommands} non-live
                </PMButton>
              )}
            </PMHStack>
            <PMStat.ValueText alignItems="baseline" color={commandsTextColor}>
              {totalCommands === 0 ? (
                <PMStat.ValueUnit>No commands yet</PMStat.ValueUnit>
              ) : (
                <>
                  {activeCommands}{' '}
                  <PMStat.ValueUnit>/ {totalCommands} total</PMStat.ValueUnit>
                </>
              )}
            </PMStat.ValueText>
            {totalCommands > 0 && (
              <PMProgress.Root
                value={(activeCommands / totalCommands) * 100}
                colorPalette={
                  totalCommands === activeCommands
                    ? 'green'
                    : activeCommands === 0
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
            <PMHStack justify="space-between" align="center" width="full">
              <PMStat.Label color={'text.primary'}>Skills</PMStat.Label>
              {nonLiveSkills > 0 && (
                <PMButton
                  variant="tertiary"
                  size="xs"
                  onClick={() => openModalOnTab('skills')}
                >
                  {nonLiveSkills} non-live
                </PMButton>
              )}
            </PMHStack>
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

      <NonLiveArtifactsDrawer
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        defaultTab={selectedTab}
      />
    </PMPageSection>
  );
};
