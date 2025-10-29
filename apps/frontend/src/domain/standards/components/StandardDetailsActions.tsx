import { PMAlertDialog, PMButton, PMHStack } from '@packmind/ui';

type SummaryActionsProps = {
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteDialogChange: (isOpen: boolean) => void;
  onConfirmDelete: () => void;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  deleteDialogMessage: string;
};

export const SummaryActions = ({
  onEdit,
  onDeleteRequest,
  onDeleteDialogChange,
  onConfirmDelete,
  isDeleteDialogOpen,
  isDeleting,
  deleteDialogMessage,
}: SummaryActionsProps) => (
  <PMHStack gap={2}>
    <PMButton variant="primary" onClick={onEdit}>
      Edit
    </PMButton>
    <PMAlertDialog
      trigger={
        <PMButton
          variant="tertiary"
          loading={isDeleting}
          onClick={onDeleteRequest}
        >
          Delete
        </PMButton>
      }
      title="Delete Standard"
      message={deleteDialogMessage}
      confirmText="Delete"
      cancelText="Cancel"
      confirmColorScheme="red"
      onConfirm={onConfirmDelete}
      open={isDeleteDialogOpen}
      onOpenChange={({ open }) => onDeleteDialogChange(open)}
      isLoading={isDeleting}
    />
  </PMHStack>
);

type RuleActionsProps = {
  onBackToSummary: () => void;
};

export const RuleActions = ({ onBackToSummary }: RuleActionsProps) => (
  <PMHStack gap={2}>
    <PMButton variant="tertiary" onClick={onBackToSummary}>
      Back to summary
    </PMButton>
  </PMHStack>
);
