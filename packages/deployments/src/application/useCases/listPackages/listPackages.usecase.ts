import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListPackagesUseCase,
  ListPackagesCommand,
  ListPackagesResponse,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'ListPackagesUsecase';

export class ListPackagesUsecase
  extends AbstractMemberUseCase<ListPackagesCommand, ListPackagesResponse>
  implements IListPackagesUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly services: DeploymentsServices,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('ListPackagesUsecase initialized');
  }

  async executeForMembers(
    command: ListPackagesCommand & MemberContext,
  ): Promise<ListPackagesResponse> {
    this.logger.info('Listing all packages for organization', {
      organizationId: command.organizationId,
    });

    try {
      // Get all packages for the organization
      const packages = await this.services
        .getPackageService()
        .getPackagesByOrganizationId(command.organizationId);

      this.logger.info('Packages listed successfully', {
        organizationId: command.organizationId,
        count: packages.length,
      });

      return { packages };
    } catch (error) {
      this.logger.error('Failed to list packages', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
