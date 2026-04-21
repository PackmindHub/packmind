import { SpaceId } from '@packmind/types';

export class ArtifactNotInSourceSpaceError extends Error {
  constructor(
    artifactType: string,
    artifactId: string,
    expectedSpaceId: SpaceId,
  ) {
    super(
      `${artifactType} ${artifactId} does not belong to the expected source space ${expectedSpaceId}`,
    );
    this.name = 'ArtifactNotInSourceSpaceError';
  }
}
