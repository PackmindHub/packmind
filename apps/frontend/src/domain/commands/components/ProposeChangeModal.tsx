import { useState } from 'react';
import {
  PMAlert,
  PMButton,
  PMButtonGroup,
  PMCloseButton,
  PMDialog,
  PMField,
  PMInput,
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
    <PMDialog.Root
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Propose a name change</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
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
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size="sm">
              <PMButton
                variant="tertiary"
                onClick={() => handleOpenChange({ open: false })}
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                onClick={handleSubmit}
                loading={createChangeProposalMutation.isPending}
                disabled={!hasChanged}
              >
                Submit proposal
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
