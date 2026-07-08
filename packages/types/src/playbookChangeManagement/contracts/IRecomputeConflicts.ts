import { CommandId } from '../../commands/CommandId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalDecision } from '../ChangeProposalDecision';
import { ChangeProposalId } from '../ChangeProposalId';

export type RecomputeConflictsCommand = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: StandardId | CommandId | SkillId;
  decisions: Record<ChangeProposalId, ChangeProposalDecision>;
};

export type RecomputeConflictsResponse = {
  conflicts: Record<ChangeProposalId, ChangeProposalId[]>;
};

export type IRecomputeConflictsUseCase = IUseCase<
  RecomputeConflictsCommand,
  RecomputeConflictsResponse
>;
