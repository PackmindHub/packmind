import {
  ApplyCreationChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalType,
  OrganizationId,
  Recipe,
  SpaceId,
  Standard,
  UserId,
} from '@packmind/types';

export type SupportedCreateChangedProposalType =
  | ChangeProposalType.createCommand
  | ChangeProposalType.createStandard;

export type CreatedIds = ApplyCreationChangeProposalsResponse['created'];

type Artefact<CP extends SupportedCreateChangedProposalType> =
  CP extends ChangeProposalType.createCommand
    ? Recipe
    : CP extends ChangeProposalType.createStandard
      ? Standard
      : never;

export interface ICreateChangeProposalApplier<
  CP extends SupportedCreateChangedProposalType,
> {
  apply(
    changeProposal: ChangeProposal<CP>,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Artefact<CP>>;

  updateCreatedIds(createdIds: CreatedIds, artefact: Artefact<CP>): CreatedIds;
}
