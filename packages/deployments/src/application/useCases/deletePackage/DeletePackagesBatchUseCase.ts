import { PackageService } from '../../services/PackageService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  PackagesDeletedEvent,
  UserId,
} from '@packmind/types';
import {
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  IDeletePackagesBatchUseCase,
} from '@packmind/types';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageChangeNotifier } from '../../services/PackageChangeNotifier';

const origin = 'DeletePackagesBatchUseCase';

export class DeletePackagesBatchUseCase implements IDeletePackagesBatchUseCase {
  constructor(
    private readonly packageService: PackageService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly packageChangeNotifier: PackageChangeNotifier,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeletePackagesBatchUseCase initialized');
  }

  public async execute(
    command: DeletePackagesBatchCommand,
  ): Promise<DeletePackagesBatchResponse> {
    const { packageIds, spaceId, userId, organizationId } = command;
    this.logger.info('Starting deletePackages batch process', {
      packageIds,
      count: packageIds.length,
      spaceId,
      userId,
      organizationId,
    });

    try {
      for (const packageId of packageIds) {
        const existingPackage =
          await this.packageService.findByIdInOrganization(
            packageId,
            createOrganizationId(organizationId),
          );

        if (!existingPackage || existingPackage.spaceId !== spaceId) {
          throw new PackageNotFoundError(packageId, spaceId);
        }
      }

      this.logger.info('Deleting packages', {
        packageIds,
        count: packageIds.length,
      });
      await this.packageService.deletePackages(packageIds, userId as UserId);

      this.eventEmitterService.emit(
        new PackagesDeletedEvent({
          userId: createUserId(userId),
          organizationId: createOrganizationId(organizationId),
          source: command.source ?? 'ui',
          packageIds,
          spaceId,
        }),
      );

      await this.packageChangeNotifier.packagesChanged(organizationId, spaceId);

      this.logger.info('Packages deletion completed successfully', {
        count: packageIds.length,
      });
      return {};
    } catch (error) {
      this.logger.error('Failed to delete packages', {
        packageIds,
        count: packageIds.length,
        spaceId,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
