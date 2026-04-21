import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMField,
  PMDialog,
  PMButton,
  PMCloseButton,
  PMInput,
  PMText,
  PMNativeSelect,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { SpaceType } from '@packmind/types';
import { useCreateSpaceMutation } from '../api/queries/SpacesManagementQueries';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';

const SPACE_TYPE_OPTIONS = [
  {
    value: SpaceType.open,
    label: 'Open — anyone in the organization can join',
  },
  // TODO: Re-enable when approval workflow is implemented
  // {
  //   value: SpaceType.restricted,
  //   label: 'Restricted — visible to everyone, approval required to join',
  // },
  {
    value: SpaceType.private,
    label: 'Private — accessible only to invited members',
  },
];

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
  const isAdmin = organization?.role === 'admin';
  const [spaceName, setSpaceName] = useState('');
  const [spaceType, setSpaceType] = useState<SpaceType>(SpaceType.private);
  const [spaceNameError, setSpaceNameError] = useState<string | undefined>();
  const createSpaceMutation = useCreateSpaceMutation();

  const handleSpaceCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spaceName.trim()) {
      setSpaceNameError('Space name is required');
      return;
    }

    try {
      const space = await createSpaceMutation.mutateAsync({
        name: spaceName.trim(),
        type: spaceType,
      });

      pmToaster.create({
        title: 'Success',
        description: `Space "${space.name}" created successfully`,
        type: 'success',
      });

      setSpaceName('');
      setSpaceType(SpaceType.private);
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
            setSpaceType(SpaceType.private);
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
              <PMVStack gap={4}>
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
                    placeholder="e.g. 'frontend team', 'security'..."
                    required
                    disabled={createSpaceMutation.isPending}
                    data-testid="create-space-name-input"
                  />
                  <PMField.ErrorText>{spaceNameError}</PMField.ErrorText>
                </PMField.Root>
                <PMField.Root
                  disabled={!isAdmin || createSpaceMutation.isPending}
                >
                  <PMField.Label>Access status</PMField.Label>
                  <PMNativeSelect
                    items={SPACE_TYPE_OPTIONS}
                    value={spaceType}
                    onChange={(e) => setSpaceType(e.target.value as SpaceType)}
                    data-testid="create-space-type-select"
                    size="sm"
                  />
                  {!isAdmin && (
                    <PMField.HelperText>
                      Only organization administrators can change space
                      visibility
                    </PMField.HelperText>
                  )}
                </PMField.Root>
              </PMVStack>
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
                data-testid="create-space-submit"
              >
                {createSpaceMutation.isPending ? 'Creating...' : 'Create space'}
              </PMButton>
            </PMDialog.Footer>
          </form>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
