import React from 'react';
import {
  PMButton,
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import { ArtifactType } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { MoveToSpaceDialog } from './MoveToSpaceDialog';

interface SpacesManagementActionsProps {
  artifactType: ArtifactType;
  selectedIds: string[];
  isSomeSelected: boolean;
  onSuccess: () => void;
}

export function SpacesManagementActions({
  artifactType,
  selectedIds,
  isSomeSelected,
  onSuccess,
}: SpacesManagementActionsProps): React.ReactElement {
  const [moveDialogOpen, setMoveDialogOpen] = React.useState(false);

  return (
    <>
      <PMButton
        variant="secondary"
        onClick={() => setMoveDialogOpen(true)}
        size="sm"
        disabled={!isSomeSelected}
        data-testid="move-to-space-button"
      >
        {`Move to space (${selectedIds.length})`}
      </PMButton>
      <MoveToSpaceDialog
        open={moveDialogOpen}
        setOpen={setMoveDialogOpen}
        artifactType={artifactType}
        selectedIds={selectedIds}
        onSuccess={onSuccess}
      />
    </>
  );
}
