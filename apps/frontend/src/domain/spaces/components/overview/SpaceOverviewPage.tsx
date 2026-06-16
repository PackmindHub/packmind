import { PMBox, PMHStack, PMPage, PMVStack } from '@packmind/ui';
import { GetStartedWithPackmindWidget } from '../../../accounts/components/GetStartedWithPackmindWidget';
import { DeploymentsOverviewRedesignContent } from '../../../deployments/components/redesign/DeploymentsOverviewRedesign';
import { OverviewSnapshot } from './OverviewSnapshot';
import { OverviewNeedsAttention } from './OverviewNeedsAttention';
import { OverviewSectionLabel } from './OverviewSectionLabel';
import { useDriftedPackages } from './useDriftedPackages';

const COLUMN_MIN_WIDTH = '320px';

export const SpaceOverviewPage = () => {
  const { driftedPackages, isReady } = useDriftedPackages();
  const showNeedsAttention = isReady && driftedPackages.length > 0;

  return (
    <PMPage title="Overview" isFullWidth>
      <PMVStack align="stretch" gap={8}>
        <GetStartedWithPackmindWidget />
        {showNeedsAttention ? (
          <PMHStack align="stretch" gap={6} wrap="wrap" rowGap={6}>
            <PMBox flex={1} minW={COLUMN_MIN_WIDTH}>
              <OverviewSnapshot />
            </PMBox>
            <PMBox flex={1} minW={COLUMN_MIN_WIDTH}>
              <OverviewNeedsAttention />
            </PMBox>
          </PMHStack>
        ) : (
          <OverviewSnapshot />
        )}
        <PMVStack align="stretch" gap={3}>
          <OverviewSectionLabel>Distribution</OverviewSectionLabel>
          <PMBox>
            <DeploymentsOverviewRedesignContent />
          </PMBox>
        </PMVStack>
      </PMVStack>
    </PMPage>
  );
};
