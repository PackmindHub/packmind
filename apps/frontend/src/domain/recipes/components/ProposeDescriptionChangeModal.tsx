import { useRef, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMButtonGroup,
  PMCloseButton,
  PMDialog,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  OrganizationId,
  RecipeId,
} from '@packmind/types';
import { useCreateChangeProposalMutation } from '../../change-proposals/api/queries/ChangeProposalsQueries';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';

interface ProposeDescriptionChangeModalProps {
  recipeDescription: string;
  recipeId: RecipeId;
  organizationId: OrganizationId;
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
}

export const ProposeDescriptionChangeModal = ({
  recipeDescription,
  recipeId,
  organizationId,
  open,
  onOpenChange,
}: ProposeDescriptionChangeModalProps) => {
  const proposedDescriptionRef = useRef(recipeDescription);
  const [hasChanged, setHasChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createChangeProposalMutation = useCreateChangeProposalMutation();

  const handleMarkdownChange = (value: string) => {
    proposedDescriptionRef.current = value;
    setHasChanged(value.trim() !== recipeDescription.trim());
  };

  const handleSubmit = () => {
    setError(null);

    createChangeProposalMutation.mutate(
      {
        organizationId,
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        payload: {
          oldValue: recipeDescription,
          newValue: proposedDescriptionRef.current.trim(),
        },
        captureMode: ChangeProposalCaptureMode.commit,
      },
      {
        onSuccess: () => {
          pmToaster.create({
            type: 'success',
            title: 'Change proposed',
            description: 'Your description change proposal has been submitted.',
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
      proposedDescriptionRef.current = recipeDescription;
      setHasChanged(false);
      setError(null);
    }
    onOpenChange(details);
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={handleOpenChange}
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Propose a description change</PMDialog.Title>
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
              <PMBox
                border="solid 1px"
                borderColor="border.primary"
                borderRadius="md"
              >
                <MarkdownEditorProvider>
                  <MarkdownEditor
                    defaultValue={recipeDescription}
                    onMarkdownChange={handleMarkdownChange}
                  />
                </MarkdownEditorProvider>
              </PMBox>
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
