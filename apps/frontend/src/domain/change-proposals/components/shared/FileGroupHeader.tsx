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
    <PMBox bg="background.secondary" borderRadius="md" px={4} py={2}>
      <PMHStack gap={3} alignItems="center">
        <PMIcon color="secondary">
          <LuFile />
        </PMIcon>
        <PMText fontSize="sm" fontWeight="bold" color="primary">
          {filePath}
        </PMText>
        <PMText fontSize="xs" color="secondary">
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
