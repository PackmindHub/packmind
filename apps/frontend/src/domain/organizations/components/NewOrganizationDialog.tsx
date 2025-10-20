import React from 'react';
import { useNavigate } from 'react-router';
import {
  PMField,
  PMDialog,
  PMButton,
  PMCloseButton,
  PMInput,
  pmToaster,
} from '@packmind/ui';
import { useCreateOrganizationMutation } from '../../accounts/api/queries/AccountsQueries';
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

      pmToaster.create({
        title: 'Success',
        description: `Organization "${organization.name}" created successfully`,
        type: 'success',
      });

      setNewOrgaName('');
      setOpen(false);

      // Delay navigation to prevent error when navigating to new organization
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });

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

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        if (!createOrganizationMutation.isPending) {
          setOpen(details.open);
          if (!details.open) {
            setNewOrgaName('');
          }
        }
      }}
      size={'lg'}
      scrollBehavior={'inside'}
      closeOnInteractOutside={false}
    >
      <form onSubmit={handleOrganizationCreation}>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Create new organization</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
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
                  disabled={createOrganizationMutation.isPending}
                />
              </PMField.Root>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMDialog.Trigger asChild>
                <PMButton
                  variant="tertiary"
                  disabled={createOrganizationMutation.isPending}
                >
                  Close
                </PMButton>
              </PMDialog.Trigger>
              <PMButton
                variant="primary"
                type="submit"
                loading={createOrganizationMutation.isPending}
              >
                {createOrganizationMutation.isPending
                  ? 'Creating...'
                  : 'Create'}
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </form>
    </PMDialog.Root>
  );
};
