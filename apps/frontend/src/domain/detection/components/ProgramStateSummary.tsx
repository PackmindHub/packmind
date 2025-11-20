import React from 'react';
import { PMHStack, PMIcon, PMText, PMBadge, PMTooltip } from '@packmind/ui';
import { LuCircleAlert, LuCircleCheck } from 'react-icons/lu';
import { DetectionStatus } from '@packmind/types';

interface ProgramStateSummaryProps {
  version?: number;
  status?: DetectionStatus;
  isOutdated?: boolean;
  hasDraftAvailable?: boolean;
}

export const ProgramStateSummary: React.FC<ProgramStateSummaryProps> = ({
  version,
  status,
  isOutdated,
  hasDraftAvailable,
}) => {
  if (!version || !status) {
    return (
      <PMText fontSize="sm" color="faded">
        No active configuration
      </PMText>
    );
  }

  return (
    <PMHStack gap={2} alignItems="center">
      <PMText fontSize="sm" color="secondary">
        v{version}
      </PMText>

      {status === DetectionStatus.READY && !isOutdated && (
        <PMBadge colorPalette="green" size="sm">
          Active
        </PMBadge>
      )}

      {isOutdated && (
        <PMTooltip
          label="Active program is outdated. Rule specifications have changed."
          placement="top"
        >
          <PMHStack gap={1} alignItems="center">
            <PMIcon color="text.warning" size="xs">
              <LuCircleAlert />
            </PMIcon>
            <PMBadge colorPalette="orange" size="sm">
              Outdated
            </PMBadge>
          </PMHStack>
        </PMTooltip>
      )}

      {hasDraftAvailable && !isOutdated && (
        <PMTooltip label="New draft available for review" placement="top">
          <PMHStack gap={1} alignItems="center">
            <PMIcon color="text.success" size="xs">
              <LuCircleCheck />
            </PMIcon>
            <PMBadge colorPalette="gray" size="sm">
              Draft Available
            </PMBadge>
          </PMHStack>
        </PMTooltip>
      )}
    </PMHStack>
  );
};
