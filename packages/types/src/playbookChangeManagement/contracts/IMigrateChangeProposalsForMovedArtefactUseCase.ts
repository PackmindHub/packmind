import { SpaceId } from '../../spaces/SpaceId';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type MigrateChangeProposalsForMovedArtefactCommand = PackmindCommand & {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  oldArtefactId: string;
  newArtefactId: string;
};

export type MigrateChangeProposalsForMovedArtefactResponse = Record<
  string,
  never
>;

export type IMigrateChangeProposalsForMovedArtefactUseCase = IUseCase<
  MigrateChangeProposalsForMovedArtefactCommand,
  MigrateChangeProposalsForMovedArtefactResponse
>;
