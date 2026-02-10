import { ChangeProposal, RecipeId } from '@packmind/types';
import { Cache } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  CommandChangeProposalType,
  IChangeProposalRepository,
} from '../../domain/repositories/IChangeProposalRepository';

const origin = 'ChangeProposalCacheRepository';

const CHANGE_PROPOSAL_TTL_SECONDS = 86400;

export class ChangeProposalCacheRepository implements IChangeProposalRepository {
  constructor(
    private readonly cache: Cache = Cache.getInstance(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async save(
    recipeId: RecipeId,
    proposal: ChangeProposal<CommandChangeProposalType>,
  ): Promise<void> {
    const key = this.buildKey(recipeId);
    const existing =
      await this.cache.get<ChangeProposal<CommandChangeProposalType>[]>(key);
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
  ): Promise<ChangeProposal<CommandChangeProposalType>[]> {
    const key = this.buildKey(recipeId);
    const proposals =
      await this.cache.get<ChangeProposal<CommandChangeProposalType>[]>(key);
    return proposals ?? [];
  }

  private buildKey(recipeId: RecipeId): string {
    return `change-proposals:command:${recipeId}`;
  }
}
