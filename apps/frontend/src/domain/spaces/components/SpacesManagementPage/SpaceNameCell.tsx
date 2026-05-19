import React from 'react';
import { Box } from '@chakra-ui/react';
import { PMBadge, PMHStack, PMText } from '@packmind/ui';
import { SpaceColorToken } from './types';

interface SpaceNameCellProps {
  name: string;
  colorToken: SpaceColorToken;
  isOrgWide: boolean;
}

export const SpaceNameCell: React.FC<SpaceNameCellProps> = ({
  name,
  colorToken,
  isOrgWide,
}) => {
  return (
    <PMHStack gap={2} align="center">
      <Box
        boxSize="2"
        borderRadius="full"
        bg={`${colorToken}.500`}
        flexShrink={0}
      />
      <PMText fontWeight="semibold">{name}</PMText>
      {isOrgWide && (
        <PMBadge size="xs" colorPalette="purple">
          org-wide
        </PMBadge>
      )}
    </PMHStack>
  );
};
