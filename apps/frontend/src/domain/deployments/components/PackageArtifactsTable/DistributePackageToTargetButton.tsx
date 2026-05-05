import React from 'react';
import {
  PMButton,
  PMText,
  PMTooltip,
  pmToaster,
  PMIcon,
  PMHStack,
} from '@packmind/ui';
import { PackageId, TargetId } from '@packmind/types';
import { useDeployPackage } from '../../hooks/useDeployPackage';
import { createPackagesDeploymentNotifications } from '../../utils/deploymentNotificationUtils';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { LuCircleCheckBig } from 'react-icons/lu';

export interface DistributePackageToTargetButtonProps {
  packageId: PackageId;
  packageName: string;
  targetId: TargetId;
  canDistributeFromApp: boolean;
  isDistributeReadinessLoading: boolean;
  hasOutdatedArtifacts: boolean;
}

export const DistributePackageToTargetButton: React.FC<
  DistributePackageToTargetButtonProps
> = ({
  packageId,
  packageName,
  targetId,
  canDistributeFromApp,
  isDistributeReadinessLoading,
  hasOutdatedArtifacts,
}) => {
  const { deployPackage, isDeploying } = useDeployPackage();

  const handleClick = async () => {
    try {
      const deployments = await deployPackage(
        { id: packageId, name: packageName },
        [targetId],
      );

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

  const isDisabled =
    isDeploying || isDistributeReadinessLoading || !canDistributeFromApp;

  const button = (
    <PMButton
      size="xs"
      variant="secondary"
      loading={isDeploying}
      disabled={isDisabled}
      onClick={handleClick}
    >
      Distribute
    </PMButton>
  );

  if (!hasOutdatedArtifacts) {
    return (
      <PMHStack gap={1} align="center" justifyContent="center">
        <PMIcon color="text.success">
          <LuCircleCheckBig />
        </PMIcon>
        <PMText color="success" variant="body-important">
          Up-to-date
        </PMText>
      </PMHStack>
    );
  }

  if (!isDistributeReadinessLoading && !canDistributeFromApp) {
    return (
      <PMTooltip label={PACKAGE_MESSAGES.distribution.notConfigured}>
        {button}
      </PMTooltip>
    );
  }

  return button;
};
