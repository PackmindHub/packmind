import React from 'react';
import { PMBadge, PMBox, PMHStack, PMStat } from '@packmind/ui';

export type DeploymentCounts = {
  upToDate: number;
  outdated: number;
};

export const DeploymentStatsSummary: React.FC<{ counts: DeploymentCounts }> = ({
  counts,
}) => {
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
          <PMStat.Label>
            <PMBadge colorPalette={'green'}>Up-to-date</PMBadge> deployments
          </PMStat.Label>
          <PMStat.ValueText>{counts.upToDate}</PMStat.ValueText>
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
          <PMStat.Label>
            <PMBadge colorPalette={'red'}>Outdated</PMBadge> deployments
          </PMStat.Label>
          <PMStat.ValueText>{counts.outdated}</PMStat.ValueText>
        </PMStat.Root>
      </PMBox>
    </PMHStack>
  );
};
