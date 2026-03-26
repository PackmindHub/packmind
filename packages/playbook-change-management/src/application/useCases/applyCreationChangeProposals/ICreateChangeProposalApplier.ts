import {
  ApplyCreationChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalType,
  CreationChangeProposalTypes,
  OrganizationId,
  Recipe,
  Skill,
  SpaceId,
  Standard,
} from '@packmind/types';

export type CreatedIds = ApplyCreationChangeProposalsResponse['created'];

type Artefact<CP extends CreationChangeProposalTypes> =
  CP extends ChangeProposalType.createCommand
    ? Recipe
    : CP extends ChangeProposalType.createStandard
      ? Standard
      : CP extends ChangeProposalType.createSkill
        ? Skill
        : never;

export interface ICreateChangeProposalApplier<
  CP extends CreationChangeProposalTypes,
> {
  apply(
    changeProposal: ChangeProposal<CP>,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Artefact<CP>>;

  updateCreatedIds(createdIds: CreatedIds, artefact: Artefact<CP>): CreatedIds;
}
