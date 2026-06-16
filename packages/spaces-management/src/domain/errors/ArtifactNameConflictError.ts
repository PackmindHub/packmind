import { ArtifactType } from '@packmind/types';

export class ArtifactNameConflictError extends Error {
  constructor(
    artifactType: ArtifactType,
    artifactName: string,
    spaceName: string,
  ) {
    super(
      `A ${artifactType} with the name "${artifactName}" already exists in the "${spaceName}" space`,
    );
    this.name = 'ArtifactNameConflictError';
  }
}
