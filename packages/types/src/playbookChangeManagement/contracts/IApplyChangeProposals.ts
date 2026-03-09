import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposalId } from '../ChangeProposalId';
import { StandardVersionId } from '../../standards';
import { RecipeVersionId } from '../../recipes';
import { SkillVersionId } from '../../skills';
import { AcceptedChangeProposal } from '../AcceptedChangeProposal';
import { PackageId } from '../../deployments';

/**
 * Maps artifact ID types to their corresponding version ID types.
 * This ensures type safety when returning version IDs for specific artifacts.
 *
 * @example
 * ArtefactVersionId<RecipeId> = RecipeVersionId
 * ArtefactVersionId<StandardId> = StandardVersionId
 * ArtefactVersionId<SkillId> = SkillVersionId
 */
export type ArtefactVersionId<T extends StandardId | RecipeId | SkillId> =
  T extends RecipeId
    ? RecipeVersionId
    : T extends StandardId
      ? StandardVersionId
      : T extends SkillId
        ? SkillVersionId
        : never;

export type ApplyChangeProposalsCommand<
  T extends StandardId | RecipeId | SkillId,
> = PackmindCommand & {
  artefactId: T;
  spaceId: SpaceId;
  accepted: AcceptedChangeProposal[];
  rejected: ChangeProposalId[];
};

export type ApplyChangeProposalsResponse<
  T extends StandardId | RecipeId | SkillId,
> = {
  newArtefactVersion: ArtefactVersionId<T>;
  updatedPackages?: PackageId[];
  artefactDeleted?: boolean;
};

export interface IApplyChangeProposalsUseCase<
  T extends StandardId | RecipeId | SkillId,
> {
  execute: (
    command: ApplyChangeProposalsCommand<T>,
  ) => Promise<ApplyChangeProposalsResponse<T>>;
}
