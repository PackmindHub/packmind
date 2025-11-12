import React from 'react';
import { PMBox, PMGrid, PMGridItem, PMPage, PMVStack } from '@packmind/ui';
import { DashboardKPI } from '../../organizations/components/dashboard/DashboardKPI';
import { OutdatedTargetsSection } from '../../organizations/components/dashboard/OutdatedTargetsSection';
import { GettingStartedWidget } from '../../organizations/components/dashboard/GettingStartedWidget';
import { OrganizationOnboardingChecklist } from '../../organizations/components/dashboard/OrganizationOnboardingChecklist';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';
import { useAuthContext } from '../hooks/useAuthContext';
import { usePlugins } from '../../../plugins/hooks/usePlugins';
import { Suspense } from 'react';
import { PMSpinner } from '@packmind/ui';

export const OrganizationHomePage: React.FC = () => {
  const { organization } = useAuthContext();
  const { dashboardComponents } = usePlugins();

  const orgId = organization?.id || ('' as string);
  const { data: onboardingStatus } = useGetOnboardingStatusQuery(orgId);

  const isOnboardingComplete =
    onboardingStatus?.hasConnectedGitProvider &&
    onboardingStatus?.hasConnectedGitRepo &&
    onboardingStatus?.hasCreatedStandard &&
    onboardingStatus?.hasDeployed &&
    onboardingStatus?.hasInvitedColleague;

  return (
    <PMPage title={'👋 Welcome to your dashboard'} centeredHeader isFullWidth>
      {!isOnboardingComplete ? (
        <PMBox width="xl" marginX="auto">
          <PMVStack gap={8} align="stretch">
            <GettingStartedWidget />
            <OrganizationOnboardingChecklist />
            {dashboardComponents.map((Component, index) => (
              <Suspense key={index} fallback={<PMSpinner />}>
                <Component />
              </Suspense>
            ))}
          </PMVStack>
        </PMBox>
      ) : (
        <PMGrid gridTemplateColumns={'3fr 2fr'} gap={8}>
          <PMGridItem>
            <PMVStack gap={8} align="stretch">
              <DashboardKPI />
              <OutdatedTargetsSection />
              {dashboardComponents.map((Component, index) => (
                <Suspense key={index} fallback={<PMSpinner />}>
                  <Component />
                </Suspense>
              ))}
            </PMVStack>
          </PMGridItem>
          <PMGridItem>
            <PMVStack gap={8} align="stretch">
              <GettingStartedWidget />
              <OrganizationOnboardingChecklist />
            </PMVStack>
          </PMGridItem>
        </PMGrid>
      )}
    </PMPage>
  );
};
