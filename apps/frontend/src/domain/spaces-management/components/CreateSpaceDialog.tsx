import React from 'react';
import {
  PMField,
  PMDialog,
  PMButton,
  PMCloseButton,
  PMInput,
  pmToaster,
} from '@packmind/ui';
import { useCreateSpaceMutation } from '../api/queries/SpacesManagementQueries';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';

interface CreateSpaceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SPACE_NAME_MAX_LENGTH = 255;

export const CreateSpaceDialog: React.FC<CreateSpaceDialogProps> = ({
  open,
  setOpen,
}) => {
  const [spaceName, setSpaceName] = React.useState('');
  const createSpaceMutation = useCreateSpaceMutation();

  const handleSpaceCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spaceName.trim()) {
      pmToaster.create({
        title: 'Error',
        description: 'Space name is required',
        type: 'error',
      });
      return;
    }

    try {
      const space = await createSpaceMutation.mutateAsync(spaceName.trim());

      pmToaster.create({
        title: 'Success',
        description: `Space "${space.name}" created successfully`,
        type: 'success',
      });

      setSpaceName('');
      setOpen(false);
    } catch (error) {
      if (isPackmindConflictError(error)) {
        pmToaster.create({
          title: 'Error',
          description: 'A space with this name already exists',
          type: 'error',
        });
      } else {
        pmToaster.create({
          title: 'Error',
          description: 'Failed to create space',
          type: 'error',
        });
      }
    }
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        if (!createSpaceMutation.isPending) {
          setOpen(details.open);
          if (!details.open) {
            setSpaceName('');
          }
        }
      }}
      size={'lg'}
      scrollBehavior={'inside'}
      closeOnInteractOutside={false}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <form onSubmit={handleSpaceCreation}>
            <PMDialog.Header>
              <PMDialog.Title>Create new space</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMField.Root required>
                <PMField.Label>
                  Space Name <PMField.RequiredIndicator />
                </PMField.Label>
                <PMInput
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  maxLength={SPACE_NAME_MAX_LENGTH}
                  placeholder="Enter space name"
                  required
                  disabled={createSpaceMutation.isPending}
                />
              </PMField.Root>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMDialog.Trigger asChild>
                <PMButton
                  variant="tertiary"
                  disabled={createSpaceMutation.isPending}
                >
                  Close
                </PMButton>
              </PMDialog.Trigger>
              <PMButton
                variant="primary"
                type="submit"
                loading={createSpaceMutation.isPending}
              >
                {createSpaceMutation.isPending ? 'Creating...' : 'Create'}
              </PMButton>
            </PMDialog.Footer>
          </form>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
