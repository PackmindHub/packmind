import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces';
import { ArtifactReference } from '../ArtifactReference';

export type MoveArtifactsToSpaceCommand = PackmindCommand & {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  artifacts: ArtifactReference[];
};

export type MoveArtifactsToSpaceResponse = { movedCount: number };

export type IMoveArtifactsToSpaceUseCase = IUseCase<
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse
>;
