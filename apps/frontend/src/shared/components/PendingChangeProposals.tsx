import { ComponentProps } from 'react';
import { PMAlert, PMAlertDialog } from '@packmind/ui';
import { ChangeProposal, ChangeProposalStatus } from '@packmind/types';

export type PendingChangeProposalsItemType = 'standard' | 'command' | 'skill';

export const countPendingChangeProposals = (
  response:
    | { changeProposals?: Array<Pick<ChangeProposal, 'status'>> }
    | undefined,
): number =>
  response?.changeProposals?.filter(
    (proposal) => proposal.status === ChangeProposalStatus.pending,
  ).length ?? 0;

const pendingChangeProposalsMessage = (
  count: number,
  itemType: PendingChangeProposalsItemType,
): string =>
  count === 1
    ? `1 change proposal is pending on this ${itemType}. Saving a new version will make it outdated.`
    : `${count} change proposals are pending on this ${itemType}. Saving a new version will make them outdated.`;

type PendingChangeProposalsWarningProps = {
  count: number;
  itemType: PendingChangeProposalsItemType;
} & ComponentProps<typeof PMAlert.Root>;

export const PendingChangeProposalsWarning = ({
  count,
  itemType,
  ...alertProps
}: PendingChangeProposalsWarningProps) => {
  if (count <= 0) {
    return null;
  }

  return (
    <PMAlert.Root status="warning" marginBottom={4} {...alertProps}>
      <PMAlert.Indicator />
      <PMAlert.Title>
        {pendingChangeProposalsMessage(count, itemType)}
      </PMAlert.Title>
    </PMAlert.Root>
  );
};

interface ConfirmSaveWithPendingProposalsDialogProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  count: number;
  itemType: PendingChangeProposalsItemType;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ConfirmSaveWithPendingProposalsDialog = ({
  open,
  onOpenChange,
  count,
  itemType,
  onConfirm,
  isLoading,
}: ConfirmSaveWithPendingProposalsDialogProps) => (
  <PMAlertDialog
    title="Save with pending change proposals?"
    message={pendingChangeProposalsMessage(count, itemType)}
    confirmText="Save anyway"
    cancelText="Cancel"
    onConfirm={onConfirm}
    open={open}
    onOpenChange={onOpenChange}
    isLoading={isLoading}
  />
);
