import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  FindMarketplaceDistributionByIdCommand,
  FindMarketplaceDistributionByIdResponse,
  IAccountsPort,
  IFindMarketplaceDistributionByIdUseCase,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';

const origin = 'FindMarketplaceDistributionByIdUseCase';

/**
 * Looks up a single `MarketplaceDistribution` row by id, scoped to the
 * caller's organization. Returns `{ marketplaceDistribution: null }` when
 * the row is missing or belongs to another organization so the controller
 * can map that to HTTP 404 without leaking cross-org existence.
 */
export class FindMarketplaceDistributionByIdUseCase
  extends AbstractMemberUseCase<
    FindMarketplaceDistributionByIdCommand,
    FindMarketplaceDistributionByIdResponse
  >
  implements IFindMarketplaceDistributionByIdUseCase
{
  constructor(
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: FindMarketplaceDistributionByIdCommand & MemberContext,
  ): Promise<FindMarketplaceDistributionByIdResponse> {
    const row = await this.marketplaceDistributionRepository.findById(
      command.marketplaceDistributionId,
    );
    if (!row || row.organizationId !== command.organization.id) {
      return { marketplaceDistribution: null };
    }
    return { marketplaceDistribution: row };
  }
}
