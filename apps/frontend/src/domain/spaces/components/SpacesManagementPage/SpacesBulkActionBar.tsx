import React from 'react';
import { Box } from '@chakra-ui/react';
import { PMButton, PMHStack, PMText } from '@packmind/ui';

interface SpacesBulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
}

export const SpacesBulkActionBar: React.FC<SpacesBulkActionBarProps> = ({
  selectedCount,
  onClear,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <Box
      bg="background.secondary"
      borderRadius="md"
      px={4}
      py={3}
      data-testid="spaces-bulk-action-bar"
    >
      <PMHStack justify="space-between" align="center" gap={4}>
        <PMHStack gap={3} align="center">
          <PMText fontWeight="semibold">{selectedCount} selected</PMText>
          <PMText color="faded">·</PMText>
          <PMButton variant="danger" size="sm" onClick={() => undefined}>
            Delete
          </PMButton>
        </PMHStack>
        <PMButton variant="tertiary" size="sm" onClick={onClear}>
          clear
        </PMButton>
      </PMHStack>
    </Box>
  );
};
