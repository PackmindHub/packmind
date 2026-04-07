import { ArtifactReference, Space, SpaceId, SpaceType } from '@packmind/types';

export type MoveArtifactsToSpaceParams = {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  artifacts: ArtifactReference[];
};

export type MoveArtifactsToSpaceResponse = { movedCount: number };

export interface ISpacesManagementGateway {
  createSpace(orgId: string, name: string, type: SpaceType): Promise<Space>;
  moveArtifactsToSpace(
    orgId: string,
    params: MoveArtifactsToSpaceParams,
  ): Promise<MoveArtifactsToSpaceResponse>;
}
