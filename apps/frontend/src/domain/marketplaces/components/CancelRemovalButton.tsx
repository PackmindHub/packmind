import { useState } from 'react';
import { PMButton, PMConfirmationModal } from '@packmind/ui';

export interface CancelRemovalButtonProps {
  pluginSlug: string;
  packageName?: string;
  marketplaceName?: string;
  onCancel: () => void;
  isCancelling: boolean;
}

/**
 * Action button + confirmation modal to cancel a pending plugin removal,
 * reverting the distribution from `to_be_removed` back to `success`.
 */
export const CancelRemovalButton = ({
  pluginSlug,
  packageName,
  marketplaceName,
  onCancel,
  isCancelling,
}: Readonly<CancelRemovalButtonProps>) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const subjectLabel = packageName ?? pluginSlug;
  const marketplaceLabel = marketplaceName ? ` on "${marketplaceName}"` : '';

  const handleConfirm = () => {
    onCancel();
    setConfirmOpen(false);
  };

  return (
    <PMConfirmationModal
      trigger={
        <PMButton
          variant="tertiary"
          size="sm"
          loading={isCancelling}
          aria-label={`Cancel removal of ${subjectLabel}${
            marketplaceName ? ` on ${marketplaceName}` : ''
          }`}
        >
          Cancel removal
        </PMButton>
      }
      title="Cancel removal"
      message={`Cancel the pending removal of "${subjectLabel}"${marketplaceLabel}? The plugin distribution will be marked as published again.`}
      confirmText="Cancel removal"
      cancelText="Keep pending"
      open={confirmOpen}
      onOpenChange={({ open }) => setConfirmOpen(open)}
      onConfirm={handleConfirm}
      isLoading={isCancelling}
    />
  );
};
