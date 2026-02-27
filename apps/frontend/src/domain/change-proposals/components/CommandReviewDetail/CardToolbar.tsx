import { PMButton, PMHStack } from '@packmind/ui';
import { LuArrowUpRight } from 'react-icons/lu';
import { CardActions } from './CardActions';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface CardToolbarProps {
  poolStatus: PoolStatus;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  onEdit: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
  onShowInFile: () => void;
}

export function CardToolbar({
  poolStatus,
  isOutdated,
  isBlockedByConflict,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  onShowInFile,
}: Readonly<CardToolbarProps>) {
  return (
    <PMHStack justifyContent="space-between" alignItems="center">
      <PMButton size="sm" variant="secondary" onClick={onShowInFile}>
        <LuArrowUpRight />
        Show in file
      </PMButton>
      <CardActions
        poolStatus={poolStatus}
        isOutdated={isOutdated}
        isBlockedByConflict={isBlockedByConflict}
        onEdit={onEdit}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onUndo={onUndo}
      />
    </PMHStack>
  );
}
