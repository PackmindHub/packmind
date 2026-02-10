import { ChangeProposal, ChangeProposalType, RecipeId } from '@packmind/types';
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

  async save(
    recipeId: RecipeId,
    proposal: ChangeProposal<ChangeProposalType>,
  ): Promise<void> {
    const key = this.buildKey(recipeId);
    const existing =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(key);
    const proposals = existing ?? [];
    proposals.push(proposal);
    await this.cache.set(key, proposals, CHANGE_PROPOSAL_TTL_SECONDS);
    this.logger.info('Saved change proposal to cache', {
      recipeId,
      proposalId: proposal.id,
    });
  }

  async findByRecipeId(
    recipeId: RecipeId,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    const key = this.buildKey(recipeId);
    const proposals =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(key);
    return proposals ?? [];
  }

  async update(
    recipeId: RecipeId,
    proposal: ChangeProposal<ChangeProposalType>,
  ): Promise<void> {
    const key = this.buildKey(recipeId);
    const existing =
      await this.cache.get<ChangeProposal<ChangeProposalType>[]>(key);
    const proposals = existing ?? [];
    const index = proposals.findIndex((p) => p.id === proposal.id);
    if (index !== -1) {
      proposals[index] = proposal;
    }
    await this.cache.set(key, proposals, CHANGE_PROPOSAL_TTL_SECONDS);
    this.logger.info('Updated change proposal in cache', {
      recipeId,
      proposalId: proposal.id,
    });
  }

  private buildKey(recipeId: RecipeId): string {
    return `change-proposals:command:${recipeId}`;
  }
}
