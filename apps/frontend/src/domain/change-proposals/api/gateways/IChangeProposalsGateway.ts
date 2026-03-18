import {
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  ChangeProposalArtefactId,
  OrganizationId,
  SpaceId,
  IListChangeProposalsBySpace,
  IListChangeProposalsByArtefact,
  IApplyChangeProposalsUseCase,
  IApplyCreationChangeProposalsUseCase,
  IRecomputeConflictsUseCase,
  NewGateway,
  RecipeId,
  StandardId,
  SkillId,
} from '@packmind/types';

export interface CreateChangeProposalParams<T extends ChangeProposalType> {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  type: T;
  artefactId: ChangeProposalArtefactId<T>;
  payload: ChangeProposalPayload<T>;
  captureMode: ChangeProposalCaptureMode;
}

export interface IChangeProposalsGateway {
  getGroupedChangeProposals: NewGateway<IListChangeProposalsBySpace>;

  listChangeProposalsByRecipe: NewGateway<
    IListChangeProposalsByArtefact<RecipeId>
  >;
  listChangeProposalsByStandard: NewGateway<
    IListChangeProposalsByArtefact<StandardId>
  >;
  listChangeProposalsBySkill: NewGateway<
    IListChangeProposalsByArtefact<SkillId>
  >;

  applyRecipeChangeProposals: NewGateway<
    IApplyChangeProposalsUseCase<RecipeId>
  >;
  applyStandardChangeProposals: NewGateway<
    IApplyChangeProposalsUseCase<StandardId>
  >;
  applySkillChangeProposals: NewGateway<IApplyChangeProposalsUseCase<SkillId>>;

  applyCreationChangeProposals: NewGateway<IApplyCreationChangeProposalsUseCase>;

  recomputeConflicts: NewGateway<IRecomputeConflictsUseCase>;

  createChangeProposal<T extends ChangeProposalType>(
    params: CreateChangeProposalParams<T>,
  ): Promise<void>;
}
