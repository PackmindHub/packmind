import { DeletePackageUsecase } from './deletePackage.usecase';
import { PackageService } from '../../services/PackageService';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test/packageFactory';
import {
  createPackageId,
  createSpaceId,
  createUserId,
  createOrganizationId,
  DeletePackageCommand,
} from '@packmind/types';

describe('DeletePackageUsecase', () => {
  let usecase: DeletePackageUsecase;
  let mockPackageService: jest.Mocked<PackageService>;

  beforeEach(() => {
    mockPackageService = {
      findById: jest.fn(),
      deletePackage: jest.fn(),
      getPackagesBySpaceId: jest.fn(),
      getPackagesBySlugsWithArtefacts: jest.fn(),
      createPackage: jest.fn(),
      deletePackages: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    usecase = new DeletePackageUsecase(mockPackageService, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('deletes package when it exists and belongs to the specified space', async () => {
      const packageId = createPackageId('pkg-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
      });

      mockPackageService.findById.mockResolvedValue(existingPackage);
      mockPackageService.deletePackage.mockResolvedValue();

      const command: DeletePackageCommand = {
        packageId,
        spaceId,
        userId,
        organizationId,
      };

      const result = await usecase.execute(command);

      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      expect(mockPackageService.deletePackage).toHaveBeenCalledWith(
        packageId,
        userId,
      );
      expect(result).toEqual({});
    });

    it('throws error when package does not exist', async () => {
      const packageId = createPackageId('non-existent');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      mockPackageService.findById.mockResolvedValue(null);

      const command: DeletePackageCommand = {
        packageId,
        spaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Package ${packageId} not found`,
      );

      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      expect(mockPackageService.deletePackage).not.toHaveBeenCalled();
    });

    it('throws error when package does not belong to specified space', async () => {
      const packageId = createPackageId('pkg-123');
      const packageSpaceId = createSpaceId('space-original');
      const requestedSpaceId = createSpaceId('space-different');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      const existingPackage = packageFactory({
        id: packageId,
        spaceId: packageSpaceId,
      });

      mockPackageService.findById.mockResolvedValue(existingPackage);

      const command: DeletePackageCommand = {
        packageId,
        spaceId: requestedSpaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Package ${packageId} does not belong to space ${requestedSpaceId}`,
      );

      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      expect(mockPackageService.deletePackage).not.toHaveBeenCalled();
    });

    it('propagates error when service throws during deletion', async () => {
      const packageId = createPackageId('pkg-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
      });

      const serviceError = new Error('Database connection failed');
      mockPackageService.findById.mockResolvedValue(existingPackage);
      mockPackageService.deletePackage.mockRejectedValue(serviceError);

      const command: DeletePackageCommand = {
        packageId,
        spaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      expect(mockPackageService.deletePackage).toHaveBeenCalledWith(
        packageId,
        userId,
      );
    });
  });
});
