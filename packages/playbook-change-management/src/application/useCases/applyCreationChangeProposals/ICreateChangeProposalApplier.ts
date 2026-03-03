import {
  ApplyCreationChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalType,
  OrganizationId,
  Recipe,
  Skill,
  SpaceId,
  Standard,
} from '@packmind/types';

export type SupportedCreateChangedProposalType =
  | ChangeProposalType.createCommand
  | ChangeProposalType.createStandard
  | ChangeProposalType.createSkill;

export type CreatedIds = ApplyCreationChangeProposalsResponse['created'];

type Artefact<CP extends SupportedCreateChangedProposalType> =
  CP extends ChangeProposalType.createCommand
    ? Recipe
    : CP extends ChangeProposalType.createStandard
      ? Standard
      : CP extends ChangeProposalType.createSkill
        ? Skill
        : never;

export interface ICreateChangeProposalApplier<
  CP extends SupportedCreateChangedProposalType,
> {
  apply(
    changeProposal: ChangeProposal<CP>,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Artefact<CP>>;

  updateCreatedIds(createdIds: CreatedIds, artefact: Artefact<CP>): CreatedIds;
}
