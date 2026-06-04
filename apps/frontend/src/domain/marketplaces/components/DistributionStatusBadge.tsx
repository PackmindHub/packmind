import { PMBadge, PMHStack, PMIcon, PMTooltip } from '@packmind/ui';
import {
  LuCheck,
  LuCircleDashed,
  LuCircleX,
  LuClock,
  LuLoader,
  LuTrash2,
} from 'react-icons/lu';
import { DistributionStatus } from '@packmind/types';
import type { IconType } from 'react-icons';

/**
 * Renders a `DistributionStatus` as a WCAG AA badge using both an icon and a
 * label (never colour alone). Used by the marketplace details distributions
 * table and the package details marketplace-distributions list.
 */
export interface DistributionStatusBadgeProps {
  status: DistributionStatus;
}

type StatusPresentation = {
  label: string;
  colorPalette: 'green' | 'orange' | 'red' | 'gray' | 'blue';
  tooltip: string;
  icon: IconType;
};

const STATUS_PRESENTATION: Record<DistributionStatus, StatusPresentation> = {
  [DistributionStatus.in_progress]: {
    label: 'In progress',
    colorPalette: 'blue',
    tooltip: 'Publication is running on Packmind.',
    icon: LuLoader,
  },
  [DistributionStatus.success]: {
    label: 'Published',
    colorPalette: 'green',
    tooltip: 'Plugin is published on the marketplace.',
    icon: LuCheck,
  },
  [DistributionStatus.failure]: {
    label: 'Failed',
    colorPalette: 'red',
    tooltip: 'The last publication attempt failed.',
    icon: LuCircleX,
  },
  [DistributionStatus.no_changes]: {
    label: 'No changes',
    colorPalette: 'gray',
    tooltip:
      'No content changes since the last publication — nothing was pushed.',
    icon: LuCircleDashed,
  },
  [DistributionStatus.to_be_removed]: {
    label: 'To be removed',
    colorPalette: 'orange',
    tooltip:
      'Marked for removal. Run packmind-cli plugins delete to open the deletion PR.',
    icon: LuClock,
  },
  [DistributionStatus.removed]: {
    label: 'Removed',
    colorPalette: 'gray',
    tooltip: 'Plugin has been removed from the marketplace.',
    icon: LuTrash2,
  },
};

export const DistributionStatusBadge = ({
  status,
}: Readonly<DistributionStatusBadgeProps>) => {
  const presentation = STATUS_PRESENTATION[status];

  return (
    <PMTooltip label={presentation.tooltip}>
      <PMBadge
        size="sm"
        colorPalette={presentation.colorPalette}
        data-testid={`distribution-status-badge-${status}`}
      >
        <PMHStack gap={1} align="center">
          <PMIcon as={presentation.icon} aria-hidden="true" />
          <span>{presentation.label}</span>
        </PMHStack>
      </PMBadge>
    </PMTooltip>
  );
};
