import React from 'react';
import {
  PMField,
  PMDialog,
  PMButton,
  PMCloseButton,
  PMInput,
} from '@packmind/ui';

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

  // should be a mutation
  const handleOrganizationCreation = () => {
    // redirect to new organization page after creation
    setOpen(false);
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        setOpen(details.open);
      }}
      size={'lg'}
      scrollBehavior={'inside'}
      closeOnInteractOutside={false}
    >
      <form>
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
                />
              </PMField.Root>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMDialog.Trigger asChild>
                <PMButton variant="tertiary">Close</PMButton>
              </PMDialog.Trigger>
              <PMButton
                variant="primary"
                onClick={handleOrganizationCreation}
                type="submit"
              >
                Create
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </form>
    </PMDialog.Root>
  );
};
