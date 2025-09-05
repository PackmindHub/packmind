import React from 'react';
import { PMBadge } from '@packmind/ui';

interface DeploymentStatusBadgeProps {
  isUpToDate: boolean;
}

export const DeploymentStatusBadge: React.FC<DeploymentStatusBadgeProps> = ({
  isUpToDate,
}) => {
  return (
    <PMBadge colorScheme={isUpToDate ? 'green' : 'red'}>
      {isUpToDate ? 'Up to date' : 'Outdated'}
    </PMBadge>
  );
};
