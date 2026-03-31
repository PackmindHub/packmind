import { ArtifactReference, Space, SpaceId } from '@packmind/types';

export type MoveArtifactsToSpaceParams = {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  artifacts: ArtifactReference[];
};

export type MoveArtifactsToSpaceResponse = { movedCount: number };

export interface ISpacesManagementGateway {
  createSpace(orgId: string, name: string): Promise<Space>;
  moveArtifactsToSpace(
    orgId: string,
    params: MoveArtifactsToSpaceParams,
  ): Promise<MoveArtifactsToSpaceResponse>;
}
