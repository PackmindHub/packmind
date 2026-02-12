import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  SpaceId,
} from '@packmind/types';

export interface IChangeProposalRepository {
  save(proposal: ChangeProposal<ChangeProposalType>): Promise<void>;
  findById(
    changeProposalId: ChangeProposalId,
  ): Promise<ChangeProposal<ChangeProposalType> | null>;
  findByArtefactId(
    artefactId: string,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
  findBySpaceId(
    spaceId: SpaceId,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
  update(proposal: ChangeProposal<ChangeProposalType>): Promise<void>;
}
