import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IGetPackageByIdUseCase,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'GetPackageByIdUsecase';

export class GetPackageByIdUsecase
  extends AbstractMemberUseCase<GetPackageByIdCommand, GetPackageByIdResponse>
  implements IGetPackageByIdUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly services: DeploymentsServices,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('GetPackageByIdUsecase initialized');
  }

  async executeForMembers(
    command: GetPackageByIdCommand & MemberContext,
  ): Promise<GetPackageByIdResponse> {
    this.logger.info('Getting package by ID', {
      packageId: command.packageId,
      organizationId: command.organizationId,
    });

    try {
      const pkg = await this.services
        .getPackageService()
        .findById(command.packageId);

      if (!pkg) {
        this.logger.warn('Package not found', {
          packageId: command.packageId,
        });
        throw new Error(`Package with id ${command.packageId} not found`);
      }

      this.logger.info('Package retrieved successfully', {
        packageId: command.packageId,
        packageName: pkg.name,
      });

      return { package: pkg };
    } catch (error) {
      this.logger.error('Failed to get package by ID', {
        packageId: command.packageId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
