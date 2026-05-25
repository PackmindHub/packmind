import { useMemo, useState } from 'react';
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

interface AddToPackagesButtonProps {
  artifactId: StandardId | RecipeId | SkillId;
  artifactType: ArtifactType;
  artifactKindLabel: AddToPackagesArtifactKind;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  orgSlug?: string;
  spaceSlug?: string;
}

export const AddToPackagesButton = ({
  artifactId,
  artifactType,
  artifactKindLabel,
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
}: AddToPackagesButtonProps) => {
  const [open, setOpen] = useState(false);
  const artifactIds = useMemo(() => [artifactId], [artifactId]);

  return (
    <>
      <PMButton variant="secondary" onClick={() => setOpen(true)}>
        <PMIcon>
          <LuPackagePlus />
        </PMIcon>
        Add to packages
      </PMButton>
      <AddToPackagesDialog
        open={open}
        onOpenChange={setOpen}
        artifactIds={artifactIds}
        artifactType={artifactType}
        artifactKindLabel={artifactKindLabel}
        organizationId={organizationId}
        spaceId={spaceId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
        onSuccess={() => undefined}
      />
    </>
  );
};
