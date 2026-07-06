import React from 'react';
import { useNavigate } from 'react-router';
import {
  PMField,
  PMDrawer,
  PMPortal,
  PMBox,
  PMButton,
  PMCloseButton,
  PMHStack,
  PMHeading,
  PMInput,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { useCreateOrganizationMutation } from '../../accounts/api/queries/AccountsQueries';
import { useSelectOrganizationMutation } from '../../accounts/api/queries/AuthQueries';
import { routes } from '../../../shared/utils/routes';

interface NewOrganizationDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ORG_NAME_MAX_LENGTH = 64;

export const NewOrganizationDialog: React.FC<NewOrganizationDialogProps> = ({
  open,
  setOpen,
}) => {
  const [newOrgaName, setNewOrgaName] = React.useState('');
  const navigate = useNavigate();
  const createOrganizationMutation = useCreateOrganizationMutation();
  const selectOrganizationMutation = useSelectOrganizationMutation();

  const isPending =
    createOrganizationMutation.isPending ||
    selectOrganizationMutation.isPending;

  const handleOrganizationCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOrgaName.trim()) {
      pmToaster.create({
        title: 'Error',
        description: 'Organization name is required',
        type: 'error',
      });
      return;
    }

    try {
      const organization = await createOrganizationMutation.mutateAsync({
        name: newOrgaName.trim(),
      });

      // Select the newly created organization before navigating
      await selectOrganizationMutation.mutateAsync({
        organizationId: organization.id,
      });

      pmToaster.create({
        title: 'Success',
        description: `Organization "${organization.name}" created successfully`,
        type: 'success',
      });

      setNewOrgaName('');
      setOpen(false);

      // Navigate to the new organization's dashboard
      navigate(routes.org.toDashboard(organization.slug));
    } catch (error) {
      pmToaster.create({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create organization',
        type: 'error',
      });
    }
  };

  const handleClose = () => {
    if (isPending) return;
    setOpen(false);
    setNewOrgaName('');
  };

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) handleClose();
      }}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <form onSubmit={handleOrganizationCreation}>
              <PMDrawer.Header
                borderBottom="1px solid"
                borderColor="border.tertiary"
              >
                <PMVStack gap={1} align="stretch" flex={1}>
                  <PMHeading size="md">Create new organization</PMHeading>
                  <PMText fontSize="xs" color="faded">
                    Set up a new organization to collaborate with your team.
                  </PMText>
                </PMVStack>
                <PMDrawer.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDrawer.CloseTrigger>
              </PMDrawer.Header>

              <PMDrawer.Body padding={5}>
                <PMField.Root required>
                  <PMField.Label>
                    Organization Name <PMField.RequiredIndicator />
                  </PMField.Label>
                  <PMInput
                    value={newOrgaName}
                    onChange={(e) => setNewOrgaName(e.target.value)}
                    maxLength={ORG_NAME_MAX_LENGTH}
                    placeholder="Enter organization name"
                    required
                    disabled={isPending}
                  />
                </PMField.Root>
              </PMDrawer.Body>

              <PMBox
                borderTop="1px solid"
                borderColor="border.tertiary"
                paddingX={5}
                paddingY={3}
              >
                <PMHStack justify="space-between" align="center">
                  <PMButton
                    variant="tertiary"
                    size="sm"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Close
                  </PMButton>
                  <PMButton
                    variant="primary"
                    size="sm"
                    type="submit"
                    loading={isPending}
                  >
                    {isPending ? 'Creating...' : 'Create'}
                  </PMButton>
                </PMHStack>
              </PMBox>
            </form>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
