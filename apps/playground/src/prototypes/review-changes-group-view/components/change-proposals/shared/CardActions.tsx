import { PMButton, PMHStack } from '@packmind/ui';
import { LuCheck, LuX, LuUndo2 } from 'react-icons/lu';
import { ProposalStatus } from '../../../types';

export function CardActions({
  poolStatus,
  onAccept,
  onDismiss,
  onUndo,
}: {
  poolStatus: ProposalStatus;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  if (poolStatus !== 'pending') {
    return (
      <PMButton size="sm" variant="ghost" onClick={onUndo}>
        <LuUndo2 />
        Undo
      </PMButton>
    );
  }

  return (
    <PMHStack gap={2}>
      <PMButton
        size="xs"
        variant="outline"
        onClick={onAccept}
        color="green.300"
        borderColor="green.300"
      >
        <LuCheck />
        Accept
      </PMButton>
      <PMButton
        size="xs"
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
