import React from 'react';
import {
  PMDialog,
  PMButton,
  PMCloseButton,
  PMSelect,
  PMSelectTrigger,
  pmCreateListCollection,
  PMText,
  pmToaster,
} from '@packmind/ui';
import { ArtifactReference, ArtifactType, SpaceId } from '@packmind/types';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';
import { useMoveArtifactsToSpaceMutation } from '../api/queries/SpacesManagementQueries';

interface MoveToSpaceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  artifactType: ArtifactType;
  selectedIds: string[];
  onSuccess: () => void;
}

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  standard: 'standard',
  skill: 'skill',
  command: 'command',
};

export const MoveToSpaceDialog: React.FC<MoveToSpaceDialogProps> = ({
  open,
  setOpen,
  artifactType,
  selectedIds,
  onSuccess,
}) => {
  const { spaceId: currentSpaceId } = useCurrentSpace();
  const { data: spaces } = useGetSpacesQuery();
  const moveArtifactsMutation = useMoveArtifactsToSpaceMutation();
  const [destinationSpaceId, setDestinationSpaceId] = React.useState<
    SpaceId | undefined
  >();

  const availableSpaces = React.useMemo(
    () => (spaces ?? []).filter((space) => space.id !== currentSpaceId),
    [spaces, currentSpaceId],
  );

  const spaceCollection = React.useMemo(
    () =>
      pmCreateListCollection({
        items: availableSpaces.map((space) => ({
          value: space.id,
          label: space.name,
        })),
      }),
    [availableSpaces],
  );

  const label = ARTIFACT_TYPE_LABELS[artifactType];
  const count = selectedIds.length;
  const pluralLabel = count > 1 ? `${label}s` : label;

  const handleMove = async () => {
    if (!destinationSpaceId) return;

    const artifacts: ArtifactReference[] = selectedIds.map((id) => ({
      id,
      type: artifactType,
    })) as ArtifactReference[];

    try {
      const result = await moveArtifactsMutation.mutateAsync({
        destinationSpaceId,
        artifacts,
      });

      const movedLabel = result.movedCount > 1 ? `${label}s` : label;
      pmToaster.create({
        title: 'Moved successfully',
        description: `${result.movedCount} ${movedLabel} moved to the selected space`,
        type: 'success',
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      pmToaster.create({
        title: 'Error',
        description: isPackmindConflictError(error)
          ? error.serverError.data.message
          : `Failed to move ${label}s`,
        type: 'error',
      });
    }
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        if (!moveArtifactsMutation.isPending) {
          setOpen(details.open);
          if (!details.open) {
            setDestinationSpaceId(undefined);
          }
        }
      }}
      size="lg"
      scrollBehavior="inside"
      closeOnInteractOutside={false}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>
              Move {count} {pluralLabel} to another space
            </PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMText mb={4}>
              Select the destination space for the selected {pluralLabel}. They
              will be removed from the current space.
            </PMText>
            <PMSelect.Root
              collection={spaceCollection}
              value={destinationSpaceId ? [destinationSpaceId] : []}
              onValueChange={(e) => {
                setDestinationSpaceId(e.value[0] as SpaceId);
              }}
            >
              <PMSelectTrigger
                mt={4}
                placeholder="Select a destination space"
                borderColor="border.tertiary"
                borderWidth="1px"
              />
              <PMSelect.Positioner>
                <PMSelect.Content zIndex={1500}>
                  {spaceCollection.items.map((item) => (
                    <PMSelect.Item item={item} key={item.value}>
                      {item.label}
                    </PMSelect.Item>
                  ))}
                </PMSelect.Content>
              </PMSelect.Positioner>
            </PMSelect.Root>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMDialog.Trigger asChild>
              <PMButton
                variant="tertiary"
                disabled={moveArtifactsMutation.isPending}
              >
                Cancel
              </PMButton>
            </PMDialog.Trigger>
            <PMButton
              variant="primary"
              onClick={handleMove}
              loading={moveArtifactsMutation.isPending}
              disabled={!destinationSpaceId}
            >
              Move
            </PMButton>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
