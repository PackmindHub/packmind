import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IGetPackageReleaseUseCase,
  GetPackageReleaseCommand,
  GetPackageReleaseResponse,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReleaseNotFoundError } from '../../../domain/errors/PackageReleaseNotFoundError';

const origin = 'GetPackageReleaseUseCase';

export class GetPackageReleaseUseCase
  extends AbstractMemberUseCase<
    GetPackageReleaseCommand,
    GetPackageReleaseResponse
  >
  implements IGetPackageReleaseUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('GetPackageReleaseUseCase initialized');
  }

  async executeForMembers(
    command: GetPackageReleaseCommand & MemberContext,
  ): Promise<GetPackageReleaseResponse> {
    const { packageId, version } = command;

    this.logger.info('Getting package release', { packageId, version });

    const pkg = await this.services.getPackageService().findById(packageId);
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }

    const release = await this.services
      .getPackageReleaseService()
      .findByVersion(packageId, version);

    if (!release) {
      throw new PackageReleaseNotFoundError(packageId, version);
    }

    return { release };
  }
}
