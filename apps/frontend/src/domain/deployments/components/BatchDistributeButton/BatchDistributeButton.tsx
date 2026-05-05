import React from 'react';
import { PMButton, PMTooltip, pmToaster } from '@packmind/ui';
import {
  DeployByTargetGroup,
  useDeployPackage,
} from '../../hooks/useDeployPackage';
import { createPackagesDeploymentNotifications } from '../../utils/deploymentNotificationUtils';

export interface BatchDistributeButtonProps {
  label: string;
  groups: DeployByTargetGroup[];
  size?: 'xs' | 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  disabledTooltip?: string;
}

export const BatchDistributeButton: React.FC<BatchDistributeButtonProps> = ({
  label,
  groups,
  size = 'xs',
  variant = 'secondary',
  disabled = false,
  disabledTooltip,
}) => {
  const { deployOutdatedByTargets, isDeploying } = useDeployPackage();

  const nonEmptyGroups = groups.filter((g) => g.packageIds.length > 0);

  const handleClick = async () => {
    try {
      const deployments = await deployOutdatedByTargets(nonEmptyGroups);
      const notifications = createPackagesDeploymentNotifications(deployments);
      notifications.forEach((notification) => {
        pmToaster.create({
          type: notification.type,
          title: notification.title,
          description: notification.description,
        });
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: 'Distribution failed',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
      });
    }
  };

  const isDisabled = disabled || isDeploying || nonEmptyGroups.length === 0;

  const button = (
    <PMButton
      size={size}
      variant={variant}
      loading={isDeploying}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {label}
    </PMButton>
  );

  if (isDisabled && disabledTooltip) {
    return <PMTooltip label={disabledTooltip}>{button}</PMTooltip>;
  }

  return button;
};
