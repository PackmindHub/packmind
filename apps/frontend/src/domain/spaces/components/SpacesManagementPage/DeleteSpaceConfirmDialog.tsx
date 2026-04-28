import { Dialog, Portal } from '@chakra-ui/react';
import { PMButton, PMText, PMVStack, pmToaster } from '@packmind/ui';
import type { Space } from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';

import { useDeleteSpaceMutation } from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

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

  const handleOpenChange = (details: { open: boolean }) => {
    if (isPending) {
      return;
    }
    if (!details.open) {
      onClose();
    }
  };

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
    <Dialog.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete space</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <PMVStack gap={3} align="stretch">
                <PMText>
                  Delete space <strong>{space.name}</strong>? This action is
                  irreversible.
                </PMText>
              </PMVStack>
            </Dialog.Body>

            <Dialog.Footer>
              <PMButton
                type="button"
                variant="tertiary"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </PMButton>
              <PMButton
                type="button"
                colorScheme="red"
                onClick={handleConfirm}
                loading={isPending}
                ml={3}
              >
                Delete
              </PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
