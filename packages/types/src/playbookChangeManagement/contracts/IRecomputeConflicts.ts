import { CommandId } from '../../commands/CommandId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalDecision } from '../ChangeProposalDecision';
import { ChangeProposalId } from '../ChangeProposalId';
import { ProposalMergeVerdictMap } from '../ProposalMergeVerdict';

export type RecomputeConflictsCommand = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: StandardId | CommandId | SkillId;
  decisions: Record<ChangeProposalId, ChangeProposalDecision>;
};

export type RecomputeConflictsResponse = {
  verdicts: ProposalMergeVerdictMap;
};

export type IRecomputeConflictsUseCase = IUseCase<
  RecomputeConflictsCommand,
  RecomputeConflictsResponse
>;
