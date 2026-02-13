import {
  ChangeProposal,
  ChangeProposalArtefactId,
  ChangeProposalId,
  ChangeProposalPayload,
  ChangeProposalType,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface IChangeProposalRepository {
  save(proposal: ChangeProposal<ChangeProposalType>): Promise<void>;
  findById(
    changeProposalId: ChangeProposalId,
  ): Promise<ChangeProposal<ChangeProposalType> | null>;
  findByArtefactId(
    spaceId: SpaceId,
    artefactId: string,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
  findBySpaceId(
    spaceId: SpaceId,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
  findExistingPending<T extends ChangeProposalType>(criteria: {
    spaceId: SpaceId;
    createdBy: UserId;
    artefactId: ChangeProposalArtefactId<T>;
    type: T;
    payload: ChangeProposalPayload<T>;
  }): Promise<ChangeProposal<T> | null>;
  update(proposal: ChangeProposal<ChangeProposalType>): Promise<void>;
}
