import React from 'react';
import {
  PMButton,
  PMText,
  PMTooltip,
  pmToaster,
  PMIcon,
  PMHStack,
} from '@packmind/ui';
import { DistributionStatus, PackageId, TargetId } from '@packmind/types';
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
  lastDistributionStatus?: DistributionStatus;
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
  lastDistributionStatus,
}) => {
  const { deployPackage, isDeploying } = useDeployPackage();

  const handleClick = async () => {
    pmToaster.create({
      type: 'success',
      title: 'Distribution started',
      description:
        'The distribution has started and may take a few minutes to complete.',
      duration: 7500,
    });

    try {
      await deployPackage({ id: packageId, name: packageName }, [targetId]);
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: 'Distribution failed',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
        duration: 15000,
      });
    }
  };

  const isDistributionInProgress =
    lastDistributionStatus === DistributionStatus.in_progress;

  const isDisabled =
    isDeploying ||
    isDistributeReadinessLoading ||
    !canDistributeFromApp ||
    isDistributionInProgress;

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

  if (isDistributionInProgress) {
    return (
      <PMTooltip label="A distribution is currently in progress for this target">
        {button}
      </PMTooltip>
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
