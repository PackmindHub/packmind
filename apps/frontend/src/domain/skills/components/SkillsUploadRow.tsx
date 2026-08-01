import { PMBadge, PMHStack, PMSpinner, PMText, PMVStack } from '@packmind/ui';

import { ImportRow } from '../hooks/useSequentialSkillImport';

type SkillsUploadRowProps = {
  row: ImportRow;
};

const StatusIndicator = ({ row }: SkillsUploadRowProps) => {
  switch (row.status) {
    case 'pending':
      return (
        <PMBadge colorPalette="gray" size="sm">
          Pending
        </PMBadge>
      );
    case 'uploading':
      // role="status" with an explicit label, because Chakra's Spinner carries
      // no accessible role of its own — a screen reader would otherwise get
      // nothing while the row is working.
      return (
        <PMHStack gap={2} role="status" aria-label={`Importing ${row.name}`}>
          <PMSpinner size="xs" />
          <PMBadge colorPalette="blue" size="sm">
            Importing
          </PMBadge>
        </PMHStack>
      );
    case 'success':
      return (
        <PMBadge colorPalette="green" size="sm">
          Imported
        </PMBadge>
      );
    case 'failed':
      return (
        <PMBadge colorPalette="red" size="sm">
          Failed
        </PMBadge>
      );
    // Deliberately not red: nothing went wrong, the user stopped the batch.
    case 'cancelled':
      return (
        <PMBadge colorPalette="gray" size="sm">
          Cancelled
        </PMBadge>
      );
  }
};

export const SkillsUploadRow = ({ row }: SkillsUploadRowProps) => (
  <PMVStack
    align="stretch"
    gap={1}
    width="full"
    borderBottom="solid 1px"
    borderColor="border.tertiary"
    paddingX={3}
    paddingY={2}
    _hover={{ backgroundColor: 'background.secondary' }}
  >
    <PMHStack justify="space-between" width="full" gap={3}>
      <PMText variant="small" truncate>
        {row.name}
      </PMText>
      <StatusIndicator row={row} />
    </PMHStack>
    {row.status === 'failed' && row.error && (
      <PMText variant="small" color="error">
        {row.error}
      </PMText>
    )}
  </PMVStack>
);
