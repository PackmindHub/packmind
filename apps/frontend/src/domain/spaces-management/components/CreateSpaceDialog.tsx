import React from 'react';
import { useNavigate } from 'react-router';
import {
  PMField,
  PMDialog,
  PMButton,
  PMCloseButton,
  PMInput,
  PMText,
  pmToaster,
} from '@packmind/ui';
import { useCreateSpaceMutation } from '../api/queries/SpacesManagementQueries';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';

interface CreateSpaceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SPACE_NAME_MAX_LENGTH = 64;

export const CreateSpaceDialog: React.FC<CreateSpaceDialogProps> = ({
  open,
  setOpen,
}) => {
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const [spaceName, setSpaceName] = React.useState('');
  const [spaceNameError, setSpaceNameError] = React.useState<
    string | undefined
  >();
  const createSpaceMutation = useCreateSpaceMutation();

  const handleSpaceCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spaceName.trim()) {
      setSpaceNameError('Space name is required');
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
      setSpaceNameError(undefined);
      setOpen(false);

      if (organization) {
        navigate(routes.space.toDashboard(organization.slug, space.slug));
      }
    } catch (error) {
      if (isPackmindConflictError(error)) {
        setSpaceNameError('A space with this name already exists');
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
            setSpaceNameError(undefined);
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
              <PMField.Root required invalid={!!spaceNameError}>
                <PMField.Label>
                  Space Name{' '}
                  <PMText as="span" variant="small" color="secondary">
                    ({spaceName.length} / {SPACE_NAME_MAX_LENGTH} max)
                  </PMText>
                  <PMField.RequiredIndicator />
                </PMField.Label>
                <PMInput
                  value={spaceName}
                  onChange={(e) => {
                    setSpaceName(e.target.value);
                    setSpaceNameError(undefined);
                  }}
                  maxLength={SPACE_NAME_MAX_LENGTH}
                  placeholder="Enter space name"
                  required
                  disabled={createSpaceMutation.isPending}
                />
                <PMField.ErrorText>{spaceNameError}</PMField.ErrorText>
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
