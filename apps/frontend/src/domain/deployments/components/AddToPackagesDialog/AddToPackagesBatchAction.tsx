import { useState } from 'react';
import { LuPackagePlus } from 'react-icons/lu';
import { PMButton, PMIcon } from '@packmind/ui';
import { OrganizationId, SpaceId } from '@packmind/types';
import {
  AddToPackagesArtifactKind,
  AddToPackagesDialog,
  ManagePackagesArtifact,
} from './AddToPackagesDialog';

type ArtifactType = 'standard' | 'recipe' | 'skill';

interface AddToPackagesBatchActionProps {
  selectedArtifacts: ManagePackagesArtifact[];
  artifactType: ArtifactType;
  artifactKindLabel: AddToPackagesArtifactKind;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  orgSlug?: string;
  spaceSlug?: string;
  onSuccess: () => void;
}

export const AddToPackagesBatchAction = ({
  selectedArtifacts,
  artifactType,
  artifactKindLabel,
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
  onSuccess,
}: AddToPackagesBatchActionProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PMButton
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={selectedArtifacts.length === 0}
      >
        <PMIcon>
          <LuPackagePlus />
        </PMIcon>
        Manage packages
      </PMButton>
      <AddToPackagesDialog
        open={open}
        onOpenChange={setOpen}
        artifacts={selectedArtifacts}
        artifactType={artifactType}
        artifactKindLabel={artifactKindLabel}
        organizationId={organizationId}
        spaceId={spaceId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
        onSuccess={onSuccess}
      />
    </>
  );
};
