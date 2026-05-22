import { useState } from 'react';
import { LuPackagePlus } from 'react-icons/lu';
import { PMButton, PMIcon } from '@packmind/ui';
import {
  OrganizationId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import {
  AddToPackagesArtifactKind,
  AddToPackagesDialog,
} from './AddToPackagesDialog';

type ArtifactType = 'standard' | 'recipe' | 'skill';
type ArtifactId = StandardId | RecipeId | SkillId;

interface AddToPackagesBatchActionProps {
  selectedIds: ArtifactId[];
  artifactType: ArtifactType;
  artifactKindLabel: AddToPackagesArtifactKind;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  orgSlug?: string;
  spaceSlug?: string;
}

export const AddToPackagesBatchAction = ({
  selectedIds,
  artifactType,
  artifactKindLabel,
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
}: AddToPackagesBatchActionProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PMButton
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={selectedIds.length === 0}
      >
        <PMIcon>
          <LuPackagePlus />
        </PMIcon>
        Add to packages
      </PMButton>
      <AddToPackagesDialog
        open={open}
        onOpenChange={setOpen}
        artifactIds={selectedIds}
        artifactType={artifactType}
        artifactKindLabel={artifactKindLabel}
        organizationId={organizationId}
        spaceId={spaceId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </>
  );
};
