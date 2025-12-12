import React from 'react';
import { PMBox, PMPage, PMVStack } from '@packmind/ui';
import { DashboardKPI } from '../../organizations/components/dashboard/DashboardKPI';
import { OutdatedTargetsSection } from '../../organizations/components/dashboard/OutdatedTargetsSection';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';
import { useAuthContext } from '../hooks/useAuthContext';
import { OnboardingSteps } from './OnboardingSteps';

export const OrganizationHomePage: React.FC = () => {
  const { organization } = useAuthContext();

  const orgId = organization?.id || ('' as string);
  const { data: onboardingStatus } = useGetOnboardingStatusQuery(orgId);

  const isOnboardingComplete = onboardingStatus?.hasDeployed;

  return (
    <PMPage title={'👋 Welcome to your dashboard'} centeredHeader>
      {!isOnboardingComplete ? (
        <PMBox width="full">
          <PMVStack gap={8} align="stretch">
            <OnboardingSteps />
          </PMVStack>
        </PMBox>
      ) : (
        <PMBox width="full">
          <PMVStack gap={8} align="stretch">
            <DashboardKPI />
            <OutdatedTargetsSection />
          </PMVStack>
        </PMBox>
      )}
    </PMPage>
  );
};
