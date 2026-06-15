import { LuFile } from 'react-icons/lu';
import { PMBadge, PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';

interface FileGroupHeaderProps {
  filePath: string;
  changeCount: number;
  pendingCount: number;
}

export function FileGroupHeader({
  filePath,
  changeCount,
  pendingCount,
}: Readonly<FileGroupHeaderProps>) {
  return (
    <PMBox
      width="full"
      bg="bg.panel"
      borderRadius="md"
      px={4}
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
