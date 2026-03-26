import { ArtifactType } from '@packmind/types';

interface SpacesManagementActionsProps {
  artifactType: ArtifactType;
  selectedIds: string[];
  isSomeSelected: boolean;
  onSuccess: () => void;
}

// TODO: Implement button + MoveToSpaceDialog modal
export function SpacesManagementActions(
  _props: SpacesManagementActionsProps,
): React.ReactElement | null {
  return null;
}
