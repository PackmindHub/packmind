import { PMButton, PMHStack } from '@packmind/ui';

interface ReviewActionButtonsProps {
  onAccept: () => void;
  onReject: () => void;
  isPending: boolean;
}

export function ReviewActionButtons({
  onAccept,
  onReject,
  isPending,
}: ReviewActionButtonsProps) {
  return (
    <PMHStack gap={2}>
      <PMButton
        size="sm"
        colorPalette="red"
        variant="outline"
        disabled={isPending}
        onClick={onReject}
      >
        Reject
      </PMButton>
      <PMButton
        size="sm"
        colorPalette="green"
        disabled={isPending}
        onClick={onAccept}
      >
        {isPending ? 'Applying...' : 'Accept'}
      </PMButton>
    </PMHStack>
  );
}
