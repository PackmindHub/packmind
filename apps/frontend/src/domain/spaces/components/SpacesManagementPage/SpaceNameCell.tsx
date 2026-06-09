import React from 'react';
import { PMBadge, PMHStack, PMStatus, PMText } from '@packmind/ui';
import type { SpaceColor } from '@packmind/types';

interface SpaceNameCellProps {
  name: string;
  color: SpaceColor;
  isDefaultSpace: boolean;
}

export const SpaceNameCell: React.FC<SpaceNameCellProps> = ({
  name,
  color,
  isDefaultSpace,
}) => {
  return (
    <PMHStack gap={2} align="center">
      <PMStatus.Root colorPalette={color} as="span">
        <PMStatus.Indicator />
      </PMStatus.Root>
      <PMText fontWeight="semibold">{name}</PMText>
      {isDefaultSpace && (
        <PMBadge size="xs" colorPalette="purple">
          org-wide
        </PMBadge>
      )}
    </PMHStack>
  );
};
