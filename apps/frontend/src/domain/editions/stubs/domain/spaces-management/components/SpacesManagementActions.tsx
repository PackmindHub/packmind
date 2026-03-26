import { ArtifactType } from '@packmind/types';

interface SpacesManagementActionsProps {
  artifactType: ArtifactType;
  selectedIds: string[];
  isSomeSelected: boolean;
  onSuccess: () => void;
}

export function SpacesManagementActions(
  _props: SpacesManagementActionsProps,
): React.ReactElement | null {
  return null;
}
