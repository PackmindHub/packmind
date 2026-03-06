import { PMButton, PMHStack } from '@packmind/ui';
import { LuCheck, LuX } from 'react-icons/lu';

interface ReviewActionButtonsProps {
  onAccept: () => void;
  onDismiss: () => void;
  isPending: boolean;
}

export function ReviewActionButtons({
  onAccept,
  onDismiss,
  isPending,
}: ReviewActionButtonsProps) {
  return (
    <PMHStack gap={2}>
      <PMButton
        size="xs"
        variant="outline"
        color="green.300"
        borderColor="green.300"
        disabled={isPending}
        onClick={onAccept}
      >
        <LuCheck /> {isPending ? 'Applying...' : 'Accept'}
      </PMButton>
      <PMButton
        size="xs"
        variant="outline"
        color="red.300"
        borderColor="red.300"
        disabled={isPending}
        onClick={onDismiss}
      >
        <LuX /> Dismiss
      </PMButton>
    </PMHStack>
  );
}
