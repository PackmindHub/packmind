import { ArtifactType } from '@packmind/types';

export class ArtifactSlugConflictError extends Error {
  constructor(
    artifactType: ArtifactType,
    artifactSlug: string,
    spaceName: string,
  ) {
    super(
      `A ${artifactType} with the slug "${artifactSlug}" already exists in the "${spaceName}" space`,
    );
    this.name = 'ArtifactSlugConflictError';
  }
}
