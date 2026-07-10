import { useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMField,
  PMHStack,
  PMInput,
  PMPortal,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  OrganizationId,
  CommandId,
  SpaceId,
} from '@packmind/types';
import { useCreateChangeProposalMutation } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';

interface ProposeChangeModalProps {
  commandName: string;
  recipeId: CommandId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
}

export const ProposeChangeModal = ({
  commandName,
  recipeId,
  organizationId,
  spaceId,
  open,
  onOpenChange,
}: ProposeChangeModalProps) => {
  const [proposedName, setProposedName] = useState(commandName);
  const [error, setError] = useState<string | null>(null);
  const createChangeProposalMutation = useCreateChangeProposalMutation();

  const hasChanged = proposedName.trim() !== commandName;

  const handleSubmit = () => {
    setError(null);

    createChangeProposalMutation.mutate(
      {
        organizationId,
        spaceId,
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        payload: { oldValue: commandName, newValue: proposedName.trim() },
        captureMode: ChangeProposalCaptureMode.commit,
      },
      {
        onSuccess: () => {
          pmToaster.create({
            type: 'success',
            title: 'Change proposed',
            description: 'Your name change proposal has been submitted.',
          });
          onOpenChange({ open: false });
        },
        onError: () => {
          setError(
            'Failed to submit change proposal. Please refresh the page and try again.',
          );
        },
      },
    );
  };

  const handleOpenChange = (details: { open: boolean }) => {
    if (!details.open) {
      setProposedName(commandName);
      setError(null);
    }
    onOpenChange(details);
  };

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header
              borderBottom="1px solid"
              borderColor="border.tertiary"
            >
              <PMDrawer.Title>Propose a name change</PMDrawer.Title>
              <PMDrawer.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
            </PMDrawer.Header>
            <PMDrawer.Body padding={5}>
              <PMVStack gap={4} align="stretch">
                {error && (
                  <PMAlert.Root status="error">
                    <PMAlert.Indicator />
                    <PMAlert.Title>{error}</PMAlert.Title>
                  </PMAlert.Root>
                )}
                <PMField.Root>
                  <PMField.Label>Command name</PMField.Label>
                  <PMInput
                    value={proposedName}
                    onChange={(e) => setProposedName(e.target.value)}
                  />
                </PMField.Root>
              </PMVStack>
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
                  onClick={() => handleOpenChange({ open: false })}
                >
                  Cancel
                </PMButton>
                <PMButton
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  loading={createChangeProposalMutation.isPending}
                  disabled={!hasChanged}
                >
                  Submit proposal
                </PMButton>
              </PMHStack>
            </PMBox>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
