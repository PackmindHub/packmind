import { ChangeProposal, ChangeProposalType, SpaceId } from '@packmind/types';

export interface IChangeProposalRepository {
  save(proposal: ChangeProposal<ChangeProposalType>): Promise<void>;
  findByArtefactId(
    artefactId: string,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
  findBySpaceId(
    spaceId: SpaceId,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
  update(proposal: ChangeProposal<ChangeProposalType>): Promise<void>;
}
