import { PMButton, PMHStack, PMTooltip } from '@packmind/ui';
import { LuPencil, LuCheck, LuX, LuUndo2 } from 'react-icons/lu';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface CardActionsProps {
  poolStatus: PoolStatus;
  isOutdated: boolean;
  isBlockedByConflict: boolean;
  onEdit: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}

export function CardActions({
  poolStatus,
  isOutdated,
  isBlockedByConflict,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
}: Readonly<CardActionsProps>) {
  if (poolStatus !== 'pending') {
    return (
      <PMButton size="sm" variant="ghost" onClick={onUndo}>
        <LuUndo2 />
        Undo
      </PMButton>
    );
  }

  const acceptDisabled = isOutdated || isBlockedByConflict;
  const acceptTooltip = isOutdated
    ? 'This proposal is outdated and cannot be accepted'
    : isBlockedByConflict
      ? 'A conflicting proposal has already been accepted'
      : undefined;

  const acceptButton = (
    <PMButton
      size="sm"
      variant="outline"
      disabled={acceptDisabled}
      onClick={onAccept}
      color="green.300"
      borderColor="green.300"
    >
      <LuCheck />
      Accept
    </PMButton>
  );

  return (
    <PMHStack gap={2}>
      <PMButton size="sm" variant="outline" onClick={onEdit}>
        <LuPencil />
        Edit
      </PMButton>
      {acceptTooltip ? (
        <PMTooltip label={acceptTooltip}>{acceptButton}</PMTooltip>
      ) : (
        acceptButton
      )}
      <PMButton
        size="sm"
        variant="outline"
        onClick={onDismiss}
        color="red.300"
        borderColor="red.300"
      >
        <LuX />
        Dismiss
      </PMButton>
    </PMHStack>
  );
}
