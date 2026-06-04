import { useState } from 'react';
import { PMButton, PMConfirmationModal, PMText, PMVStack } from '@packmind/ui';

export interface RemovePluginButtonProps {
  pluginSlug: string;
  marketplaceName?: string;
  packageName?: string;
  onMark: () => void;
  isMarking: boolean;
}

/**
 * Action button + confirmation modal to mark a marketplace plugin distribution
 * as `to_be_removed`. The modal body explains that removal in Packmind is the
 * first step: the user still needs to run `packmind-cli plugins delete <slug>`
 * locally to open the deletion PR on the marketplace repo.
 *
 * Mirrors the unlink-marketplace affordance in `MarketplaceRow.tsx`.
 */
export const RemovePluginButton = ({
  pluginSlug,
  marketplaceName,
  packageName,
  onMark,
  isMarking,
}: Readonly<RemovePluginButtonProps>) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    onMark();
    setConfirmOpen(false);
  };

  const subjectLabel = packageName ?? pluginSlug;
  const marketplaceLabel = marketplaceName ? ` from "${marketplaceName}"` : '';

  return (
    <PMConfirmationModal
      trigger={
        <PMButton
          variant="danger"
          size="sm"
          loading={isMarking}
          aria-label={`Remove ${subjectLabel}${
            marketplaceName ? ` from ${marketplaceName}` : ''
          }`}
        >
          Remove
        </PMButton>
      }
      title="Remove plugin from marketplace"
      message={
        <PMVStack align="stretch" gap={2}>
          <PMText>
            {`Mark "${subjectLabel}"${marketplaceLabel} for removal? Existing installs will stay in place until the deletion PR is merged.`}
          </PMText>
          <PMText variant="small" color="secondary">
            {`Next step: run packmind-cli plugins delete ${pluginSlug} locally to open the deletion PR on the marketplace repository.`}
          </PMText>
        </PMVStack>
      }
      confirmText="Mark for removal"
      confirmColorScheme="red"
      open={confirmOpen}
      onOpenChange={({ open }) => setConfirmOpen(open)}
      onConfirm={handleConfirm}
      isLoading={isMarking}
    />
  );
};
