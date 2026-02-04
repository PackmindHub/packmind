import React from 'react';
import { PMBox, PMPage, PMVStack } from '@packmind/ui';
import { DashboardKPI } from '../../organizations/components/dashboard/DashboardKPI';
import { OutdatedTargetsSection } from '../../organizations/components/dashboard/OutdatedTargetsSection';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';
import { useAuthContext } from '../hooks/useAuthContext';
import { OnboardingSteps } from './OnboardingSteps';
import { GetStartedWithPackmindWidget } from './GetStartedWithPackmindWidget';

export const OrganizationHomePage: React.FC = () => {
  const { organization } = useAuthContext();

  const orgId = organization?.id || ('' as string);
  const { data: onboardingStatus } = useGetOnboardingStatusQuery(orgId);

  const isOnboardingComplete = onboardingStatus?.hasDeployed;

  return (
    <PMPage title={'Dashboard'}>
      <PMBox width="full">
        <PMVStack gap={8} align="stretch">
          <GetStartedWithPackmindWidget />
          {!isOnboardingComplete ? (
            <OnboardingSteps />
          ) : (
            <>
              <DashboardKPI />
              <OutdatedTargetsSection />
            </>
          )}
        </PMVStack>
      </PMBox>
    </PMPage>
  );
};
