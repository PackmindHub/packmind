import React from 'react';
import { PMBadge } from '@packmind/ui';

interface DeploymentStatusBadgeProps {
  isUpToDate: boolean;
  deploymentStatus?: 'success' | 'failure'; // New status from target deployment tracking
}

export const DeploymentStatusBadge: React.FC<DeploymentStatusBadgeProps> = ({
  isUpToDate,
  deploymentStatus,
}) => {
  // Handle deployment failure status first (highest priority)
  if (deploymentStatus === 'failure') {
    return <PMBadge colorScheme="red">Failed</PMBadge>;
  }

  // Handle up-to-date status for successful deployments
  return (
    <PMBadge colorScheme={isUpToDate ? 'green' : 'yellow'}>
      {isUpToDate ? 'Up to date' : 'Outdated'}
    </PMBadge>
  );
};
