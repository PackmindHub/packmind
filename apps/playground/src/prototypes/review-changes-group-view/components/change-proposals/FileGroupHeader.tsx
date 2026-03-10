import { PMBox, PMHStack, PMIcon, PMText, PMBadge } from '@packmind/ui';
import { LuFile } from 'react-icons/lu';

export function FileGroupHeader({
  filePath,
  changeCount,
  pendingCount,
}: {
  filePath: string;
  changeCount: number;
  pendingCount: number;
}) {
  return (
    <PMBox
      width="full"
      bg="bg.panel"
      borderRadius="md"
      px={6}
      py={2}
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <PMHStack gap={3} alignItems="center" justifyContent="flex-start">
        <PMIcon color="text.faded">
          <LuFile />
        </PMIcon>
        <PMText fontSize="sm" fontWeight="semibold" color="faded">
          {filePath}
        </PMText>
        <PMText fontSize="xs" color="faded">
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </PMText>
        {pendingCount > 0 && (
          <PMBadge colorPalette="yellow" variant="subtle" size="sm">
            {pendingCount} pending
          </PMBadge>
        )}
      </PMHStack>
    </PMBox>
  );
}
