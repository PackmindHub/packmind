import { ArtifactType, FileModification } from '@packmind/types';

export type DiffableFile = FileModification & {
  content: string;
  artifactType: ArtifactType;
  artifactName: string;
};
