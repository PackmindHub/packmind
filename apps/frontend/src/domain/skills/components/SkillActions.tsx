import { PMAlertDialog, PMButton, PMHStack } from '@packmind/ui';

type SkillActionsProps = {
  onDeleteRequest: () => void;
  onDeleteDialogChange: (isOpen: boolean) => void;
  onConfirmDelete: () => void;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  deleteDialogMessage: string;
};

export const SkillActions = ({
  onDeleteRequest,
  onDeleteDialogChange,
  onConfirmDelete,
  isDeleteDialogOpen,
  isDeleting,
  deleteDialogMessage,
}: SkillActionsProps) => (
  <PMHStack gap={2}>
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
      title="Delete Skill"
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
