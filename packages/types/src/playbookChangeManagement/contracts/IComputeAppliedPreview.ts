import { CommandId } from '../../commands/CommandId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalDecision } from '../ChangeProposalDecision';
import { ChangeProposalId } from '../ChangeProposalId';
import { ApplierObjectVersions } from '../applier/types';

export type ComputeAppliedPreviewCommand = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: StandardId | CommandId | SkillId;
  decisions: Record<ChangeProposalId, ChangeProposalDecision>;
};

export type ComputeAppliedPreviewResponse = {
  preview: ApplierObjectVersions;
};

export type IComputeAppliedPreviewUseCase = IUseCase<
  ComputeAppliedPreviewCommand,
  ComputeAppliedPreviewResponse
>;
