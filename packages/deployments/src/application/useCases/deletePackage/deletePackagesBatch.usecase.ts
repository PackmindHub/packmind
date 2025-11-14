import { PackageService } from '../../services/PackageService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { UserId } from '@packmind/types';
import {
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  IDeletePackagesBatchUseCase,
} from '@packmind/types';

const origin = 'DeletePackagesBatchUsecase';

export class DeletePackagesBatchUsecase implements IDeletePackagesBatchUseCase {
  constructor(
    private readonly packageService: PackageService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeletePackagesBatchUsecase initialized');
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
        const existingPackage = await this.packageService.findById(packageId);

        if (!existingPackage) {
          this.logger.error('Package not found', { packageId });
          throw new Error(`Package ${packageId} not found`);
        }

        if (existingPackage.spaceId !== spaceId) {
          this.logger.error('Package does not belong to specified space', {
            packageId,
            packageSpaceId: existingPackage.spaceId,
            requestedSpaceId: spaceId,
          });
          throw new Error(
            `Package ${packageId} does not belong to space ${spaceId}`,
          );
        }
      }

      this.logger.info('Deleting packages', {
        packageIds,
        count: packageIds.length,
      });
      await this.packageService.deletePackages(packageIds, userId as UserId);

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
