import { ChangeProposal, ChangeProposalType, SpaceId } from '@packmind/types';
import { Cache } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';

const origin = 'ChangeProposalCacheRepository';

const CHANGE_PROPOSAL_TTL_SECONDS = 86400;

export class ChangeProposalCacheRepository implements IChangeProposalRepository {
  constructor(
    private readonly cache: Cache = Cache.getInstance(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async save(proposal: ChangeProposal<ChangeProposalType>): Promise<void> {
    const artefactKey = this.buildArtefactKey(proposal.artefactId);
    const existing =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(artefactKey);
    const proposals = existing ?? [];
    proposals.push(proposal);
    await this.cache.set(artefactKey, proposals, CHANGE_PROPOSAL_TTL_SECONDS);

    const spaceKey = this.buildSpaceKey(proposal.spaceId);
    const spaceExisting =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(spaceKey);
    const spaceProposals = spaceExisting ?? [];
    spaceProposals.push(proposal);
    await this.cache.set(spaceKey, spaceProposals, CHANGE_PROPOSAL_TTL_SECONDS);

    this.logger.info('Saved change proposal to cache', {
      artefactId: proposal.artefactId,
      proposalId: proposal.id,
    });
  }

  async findByArtefactId(
    artefactId: string,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    const key = this.buildArtefactKey(artefactId);
    const proposals =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(key);
    return proposals ?? [];
  }

  async findBySpaceId(
    spaceId: SpaceId,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    const key = this.buildSpaceKey(spaceId);
    const proposals =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(key);
    return proposals ?? [];
  }

  async update(proposal: ChangeProposal<ChangeProposalType>): Promise<void> {
    const artefactKey = this.buildArtefactKey(proposal.artefactId);
    const existing =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(artefactKey);
    const proposals = existing ?? [];
    const index = proposals.findIndex((p) => p.id === proposal.id);
    if (index !== -1) {
      proposals[index] = proposal;
    }
    await this.cache.set(artefactKey, proposals, CHANGE_PROPOSAL_TTL_SECONDS);

    const spaceKey = this.buildSpaceKey(proposal.spaceId);
    const spaceExisting =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(spaceKey);
    const spaceProposals = spaceExisting ?? [];
    const spaceIndex = spaceProposals.findIndex((p) => p.id === proposal.id);
    if (spaceIndex !== -1) {
      spaceProposals[spaceIndex] = proposal;
    }
    await this.cache.set(spaceKey, spaceProposals, CHANGE_PROPOSAL_TTL_SECONDS);

    this.logger.info('Updated change proposal in cache', {
      artefactId: proposal.artefactId,
      proposalId: proposal.id,
    });
  }

  private buildArtefactKey(artefactId: string): string {
    return `change-proposals:artefact:${artefactId}`;
  }

  private buildSpaceKey(spaceId: SpaceId): string {
    return `change-proposals:space:${spaceId}`;
  }
}
