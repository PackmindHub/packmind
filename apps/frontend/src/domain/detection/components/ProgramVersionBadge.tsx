import React from 'react';
import { PMBadge, PMHStack, PMText } from '@packmind/ui';
import { DetectionStatus } from '@packmind/types';

export type ProgramState = 'active' | 'draft' | 'outdated';

interface ProgramVersionBadgeProps {
  version: number;
  createdAt?: Date;
  programState: ProgramState;
  status: DetectionStatus;
}

const PROGRAM_STATE_CONFIG: Record<
  ProgramState,
  { label: string; colorPalette: string }
> = {
  active: { label: 'Active', colorPalette: 'green' },
  draft: { label: 'Draft', colorPalette: 'gray' },
  outdated: { label: 'Outdated', colorPalette: 'orange' },
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const ProgramVersionBadge: React.FC<ProgramVersionBadgeProps> = ({
  version,
  createdAt,
  programState,
}) => {
  const stateConfig = PROGRAM_STATE_CONFIG[programState];
  const formattedDate = createdAt ? formatDate(createdAt) : null;

  return (
    <PMHStack gap={2} alignItems="center">
      <PMBadge colorPalette={stateConfig.colorPalette} size="sm">
        {stateConfig.label}
      </PMBadge>
      <PMText fontSize="sm" color="faded">
        Version {version}
        {formattedDate && ` • Generated on ${formattedDate}`}
      </PMText>
    </PMHStack>
  );
};
