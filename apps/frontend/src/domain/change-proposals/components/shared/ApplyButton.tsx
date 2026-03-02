import { PMButton } from '@packmind/ui';

interface ApplyButtonProps {
  acceptedCount: number;
  hasPooledDecisions: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function ApplyButton({
  acceptedCount,
  hasPooledDecisions,
  isSaving,
  onSave,
}: Readonly<ApplyButtonProps>) {
  return (
    <PMButton
      size="sm"
      variant="outline"
      colorPalette="blue"
      disabled={!hasPooledDecisions || isSaving}
      loading={isSaving}
      loadingText="Applying..."
      onClick={onSave}
    >
      Apply ({acceptedCount})
    </PMButton>
  );
}
