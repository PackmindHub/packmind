import React from 'react';
import {
  PMButton,
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
  SPACES_MANAGEMENT_FEATURE_KEY,
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
          data-testid="move-to-space-button"
        >
          {`Move to space (${selectedIds.length})`}
        </PMButton>
      </PMFeatureFlag>
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
