import { useRef, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMPortal,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { useCreateChangeProposalMutation } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';

interface ProposeDescriptionChangeModalProps {
  recipeDescription: string;
  recipeId: RecipeId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
}

export const ProposeDescriptionChangeModal = ({
  recipeDescription,
  recipeId,
  organizationId,
  spaceId,
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
        spaceId,
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
    <PMDrawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      placement="end"
      size="xl"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header
              borderBottom="1px solid"
              borderColor="border.tertiary"
            >
              <PMDrawer.Title>Propose a description change</PMDrawer.Title>
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
