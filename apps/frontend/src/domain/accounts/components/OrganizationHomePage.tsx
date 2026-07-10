import React from 'react';
import { PMBox, PMPage, PMVStack } from '@packmind/ui';
import { DashboardKPI } from '../../organizations/components/dashboard/DashboardKPI';
import { OutdatedTargetsSection } from '../../organizations/components/dashboard/OutdatedTargetsSection';

export const OrganizationHomePage: React.FC = () => {
  return (
    <PMPage title={'Dashboard'}>
      <PMBox width="full">
        <PMVStack gap={8} align="stretch">
          <DashboardKPI />
          <OutdatedTargetsSection />
        </PMVStack>
      </PMBox>
    </PMPage>
  );
};
