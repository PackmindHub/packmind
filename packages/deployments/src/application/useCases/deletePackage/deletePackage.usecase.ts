import { PackageService } from '../../services/PackageService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { UserId } from '@packmind/types';
import {
  DeletePackageCommand,
  DeletePackageResponse,
  IDeletePackageUseCase,
} from '@packmind/types';

const origin = 'DeletePackageUsecase';

export class DeletePackageUsecase implements IDeletePackageUseCase {
  constructor(
    private readonly packageService: PackageService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeletePackageUsecase initialized');
  }

  public async execute(
    command: DeletePackageCommand,
  ): Promise<DeletePackageResponse> {
    const { packageId, spaceId, userId, organizationId } = command;
    this.logger.info('Starting deletePackage process', {
      packageId,
      spaceId,
      userId,
      organizationId,
    });

    try {
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

      this.logger.info('Deleting package', { packageId });
      await this.packageService.deletePackage(packageId, userId as UserId);

      this.logger.info('Package deletion completed successfully', {
        packageId,
      });
      return {};
    } catch (error) {
      this.logger.error('Failed to delete package', {
        packageId,
        spaceId,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
