import React from 'react';
import {
  PMButton,
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
  SPACES_MANAGEMENT_FEATURE_KEY,
} from '@packmind/ui';
import { ArtifactType } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { MoveToSpaceDialog, MoveArtifactType } from './MoveToSpaceDialog';

const ARTIFACT_TYPE_TO_MOVE_TYPE: Record<ArtifactType, MoveArtifactType> = {
  standard: 'standard',
  skill: 'skill',
  command: 'recipe',
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  standard: 'standard',
  skill: 'skill',
  command: 'command',
};

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
  const { user } = useAuthContext();

  return (
    <>
      <PMFeatureFlag
        featureKeys={[SPACES_MANAGEMENT_FEATURE_KEY]}
        featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
        userEmail={user?.email}
      >
        <PMButton
          variant="secondary"
          onClick={() => setMoveDialogOpen(true)}
          size="sm"
          disabled={!isSomeSelected}
        >
          {`Move to space (${selectedIds.length})`}
        </PMButton>
      </PMFeatureFlag>
      <MoveToSpaceDialog
        open={moveDialogOpen}
        setOpen={setMoveDialogOpen}
        artifactType={ARTIFACT_TYPE_TO_MOVE_TYPE[artifactType]}
        selectedIds={selectedIds}
        onSuccess={onSuccess}
      />
    </>
  );
}
