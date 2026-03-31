import { SpaceId } from '../../spaces/SpaceId';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type RuleMapping = { oldRuleId: string; newRuleId: string };

export type MigrateChangeProposalsForMovedArtefactCommand = PackmindCommand & {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  oldArtefactId: string;
  newArtefactId: string;
  ruleMappings?: RuleMapping[];
};

export type MigrateChangeProposalsForMovedArtefactResponse = Record<
  string,
  never
>;

export type IMigrateChangeProposalsForMovedArtefactUseCase = IUseCase<
  MigrateChangeProposalsForMovedArtefactCommand,
  MigrateChangeProposalsForMovedArtefactResponse
>;
