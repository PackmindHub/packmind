import React from 'react';
import { useNavigate } from 'react-router';
import {
  PMField,
  PMDialog,
  PMButton,
  PMCloseButton,
  PMInput,
  PMText,
  PMRadioCard,
  PMHStack,
  PMIcon,
  pmToaster,
} from '@packmind/ui';
import { SpaceType } from '@packmind/types';
import { LuGlobe, LuShieldCheck, LuLock } from 'react-icons/lu';
import { useCreateSpaceMutation } from '../api/queries/SpacesManagementQueries';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';

const SPACE_TYPE_OPTIONS = [
  {
    value: SpaceType.open,
    label: 'Open',
    description: 'Anyone can join',
    icon: LuGlobe,
  },
  {
    value: SpaceType.restricted,
    label: 'Restricted',
    description: 'Approval required to join',
    icon: LuShieldCheck,
  },
  {
    value: SpaceType.private,
    label: 'Private',
    description: 'Invite only',
    icon: LuLock,
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
  const [spaceName, setSpaceName] = React.useState('');
  const [spaceType, setSpaceType] = React.useState<SpaceType>(SpaceType.open);
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
      setSpaceType(SpaceType.open);
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
            setSpaceType(SpaceType.open);
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
                  placeholder="e.g. 'frontend team', 'security'..."
                  required
                  disabled={createSpaceMutation.isPending}
                  data-testid="create-space-name-input"
                />
                <PMField.ErrorText>{spaceNameError}</PMField.ErrorText>
              </PMField.Root>
              <PMField.Root>
                <PMField.Label>Access status</PMField.Label>
                <PMRadioCard.Root
                  size="sm"
                  variant="outline"
                  value={spaceType}
                  onValueChange={(e) => setSpaceType(e.value as SpaceType)}
                  disabled={createSpaceMutation.isPending}
                >
                  <PMHStack gap={2} alignItems="stretch">
                    {SPACE_TYPE_OPTIONS.map((option) => (
                      <PMRadioCard.Item key={option.value} value={option.value}>
                        <PMRadioCard.ItemHiddenInput />
                        <PMRadioCard.ItemControl>
                          <PMRadioCard.ItemContent>
                            <PMIcon as={option.icon} color="text.tertiary" />
                            <PMRadioCard.ItemText fontWeight="semibold">
                              {option.label}
                            </PMRadioCard.ItemText>
                            <PMText variant="small" color="secondary">
                              {option.description}
                            </PMText>
                          </PMRadioCard.ItemContent>
                          <PMRadioCard.ItemIndicator />
                        </PMRadioCard.ItemControl>
                      </PMRadioCard.Item>
                    ))}
                  </PMHStack>
                </PMRadioCard.Root>
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
