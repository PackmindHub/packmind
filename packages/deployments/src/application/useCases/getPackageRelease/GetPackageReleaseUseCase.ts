import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  IGetPackageReleaseUseCase,
  GetPackageReleaseCommand,
  GetPackageReleaseResponse,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReleaseNotFoundError } from '../../../domain/errors/PackageReleaseNotFoundError';

const origin = 'GetPackageReleaseUseCase';

export class GetPackageReleaseUseCase
  extends AbstractSpaceMemberUseCase<
    GetPackageReleaseCommand,
    GetPackageReleaseResponse
  >
  implements IGetPackageReleaseUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('GetPackageReleaseUseCase initialized');
  }

  async executeForSpaceMembers(
    command: GetPackageReleaseCommand & SpaceMemberContext,
  ): Promise<GetPackageReleaseResponse> {
    const { packageId, version, spaceId } = command;

    this.logger.info('Getting package release', { packageId, version });

    const pkg = await this.services.getPackageService().findById(packageId);
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }

    if (pkg.spaceId !== spaceId) {
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
