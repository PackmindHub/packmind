import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListMarketplaceDistributionsForPackageUseCase,
  ISpacesPort,
  ListMarketplaceDistributionsForPackageCommand,
  ListMarketplaceDistributionsForPackageResponse,
} from '@packmind/types';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';

const origin = 'ListMarketplaceDistributionsForPackageUseCase';

/**
 * Lists every marketplace distribution row attached to a package, newest
 * first. Member-scoped.
 *
 * Used by the frontend's status helper to poll the publish lifecycle for a
 * given package (in_progress → success | failure | no_changes).
 */
export class ListMarketplaceDistributionsForPackageUseCase
  extends AbstractMemberUseCase<
    ListMarketplaceDistributionsForPackageCommand,
    ListMarketplaceDistributionsForPackageResponse
  >
  implements IListMarketplaceDistributionsForPackageUseCase
{
  constructor(
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly packageService: PackageService,
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListMarketplaceDistributionsForPackageCommand & MemberContext,
  ): Promise<ListMarketplaceDistributionsForPackageResponse> {
    const { packageId, organization } = command;

    this.logger.info('Listing marketplace distributions for package', {
      packageId,
      organizationId: organization.id,
    });

    const pkg = await this.packageService.findById(packageId);
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }
    const space = await this.spacesPort.getSpaceById(pkg.spaceId);
    if (!space || space.organizationId !== organization.id) {
      throw new PackageNotFoundError(packageId);
    }

    return this.marketplaceDistributionRepository.findByPackageId(packageId);
  }
}
