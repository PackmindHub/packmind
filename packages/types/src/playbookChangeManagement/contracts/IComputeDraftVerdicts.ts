import { CommandId } from '../../commands/CommandId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { ArtefactDraft } from '../ArtefactDraft';
import { ProposalMergeVerdictMap } from '../ProposalMergeVerdict';

/**
 * Computes, for every pending proposal on an artefact, whether it would still
 * merge if the supplied draft were saved. Lets the edit forms warn with the real
 * number of proposals a save would outdate instead of assuming it outdates all
 * of them.
 */
export type ComputeDraftVerdictsCommand = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: StandardId | CommandId | SkillId;
  draft: ArtefactDraft;
};

export type ComputeDraftVerdictsResponse = {
  verdicts: ProposalMergeVerdictMap;
};

export type IComputeDraftVerdictsUseCase = IUseCase<
  ComputeDraftVerdictsCommand,
  ComputeDraftVerdictsResponse
>;
