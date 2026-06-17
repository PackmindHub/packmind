import { PMText, pmToaster } from '@packmind/ui';
import type { Space } from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';

import { useDeleteSpaceMutation } from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { TypeToConfirmDialog } from '../../../../shared/components/TypeToConfirmDialog';

type DeleteSpaceConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  space: Pick<Space, 'id' | 'name'>;
};

export function DeleteSpaceConfirmDialog({
  isOpen,
  onClose,
  space,
}: Readonly<DeleteSpaceConfirmDialogProps>) {
  const { organization } = useAuthContext();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useDeleteSpaceMutation();

  const handleConfirm = () => {
    mutate(
      { spaceId: space.id },
      {
        onSuccess: async () => {
          pmToaster.create({
            type: 'success',
            title: `Space '${space.name}' deleted`,
          });
          if (organization?.id) {
            await queryClient.invalidateQueries({
              queryKey: [
                'organizations',
                organization.id,
                'spaces',
                'management',
              ],
            });
          }
          onClose();
        },
        onError: () => {
          pmToaster.create({
            type: 'error',
            title: 'Failed to delete space',
            description:
              'An error occurred while deleting the space. Please try again.',
          });
        },
      },
    );
  };

  return (
    <TypeToConfirmDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      title="Delete space"
      expectedValue={space.name}
      inputPlaceholder="Enter space name"
      confirmLabel="Delete"
      isPending={isPending}
      onConfirm={handleConfirm}
    >
      <PMText>
        This will permanently delete <strong>{space.name}</strong>. This action
        is irreversible.
      </PMText>
    </TypeToConfirmDialog>
  );
}
