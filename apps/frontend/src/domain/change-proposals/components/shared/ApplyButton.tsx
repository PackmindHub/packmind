import { ApplyConfirmationPopover } from './ApplyConfirmationPopover';

interface ApplyButtonProps {
  acceptedCount: number;
  dismissedCount: number;
  pendingCount: number;
  hasPooledDecisions: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function ApplyButton({
  acceptedCount,
  dismissedCount,
  pendingCount,
  hasPooledDecisions,
  isSaving,
  onSave,
}: Readonly<ApplyButtonProps>) {
  return (
    <ApplyConfirmationPopover
      acceptedCount={acceptedCount}
      dismissedCount={dismissedCount}
      pendingCount={pendingCount}
      hasPooledDecisions={hasPooledDecisions}
      isSaving={isSaving}
      onSave={onSave}
    />
  );
}
