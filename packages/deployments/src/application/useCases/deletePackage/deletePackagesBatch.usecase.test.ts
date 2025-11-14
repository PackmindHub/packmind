import { DeletePackagesBatchUsecase } from './deletePackagesBatch.usecase';
import { PackageService } from '../../services/PackageService';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test/packageFactory';
import {
  createPackageId,
  createSpaceId,
  createUserId,
  createOrganizationId,
  DeletePackagesBatchCommand,
} from '@packmind/types';

describe('DeletePackagesBatchUsecase', () => {
  let usecase: DeletePackagesBatchUsecase;
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

    usecase = new DeletePackagesBatchUsecase(mockPackageService, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('deletes multiple packages when they all exist and belong to the specified space', async () => {
      const packageId1 = createPackageId('pkg-123');
      const packageId2 = createPackageId('pkg-456');
      const packageId3 = createPackageId('pkg-789');
      const spaceId = createSpaceId('space-999');
      const userId = createUserId('user-111');
      const organizationId = createOrganizationId('org-222');

      const package1 = packageFactory({ id: packageId1, spaceId });
      const package2 = packageFactory({ id: packageId2, spaceId });
      const package3 = packageFactory({ id: packageId3, spaceId });

      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(package2)
        .mockResolvedValueOnce(package3);
      mockPackageService.deletePackages.mockResolvedValue();

      const command: DeletePackagesBatchCommand = {
        packageIds: [packageId1, packageId2, packageId3],
        spaceId,
        userId,
        organizationId,
      };

      const result = await usecase.execute(command);

      expect(mockPackageService.findById).toHaveBeenCalledTimes(3);
      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId1);
      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId2);
      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId3);
      expect(mockPackageService.deletePackages).toHaveBeenCalledWith(
        [packageId1, packageId2, packageId3],
        userId,
      );
      expect(result).toEqual({});
    });

    it('deletes single package successfully', async () => {
      const packageId = createPackageId('pkg-single');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      const existingPackage = packageFactory({ id: packageId, spaceId });

      mockPackageService.findById.mockResolvedValue(existingPackage);
      mockPackageService.deletePackages.mockResolvedValue();

      const command: DeletePackagesBatchCommand = {
        packageIds: [packageId],
        spaceId,
        userId,
        organizationId,
      };

      const result = await usecase.execute(command);

      expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      expect(mockPackageService.deletePackages).toHaveBeenCalledWith(
        [packageId],
        userId,
      );
      expect(result).toEqual({});
    });

    it('throws error when one of the packages does not exist', async () => {
      const packageId1 = createPackageId('pkg-exists');
      const packageId2 = createPackageId('pkg-not-found');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      const package1 = packageFactory({ id: packageId1, spaceId });

      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(null);

      const command: DeletePackagesBatchCommand = {
        packageIds: [packageId1, packageId2],
        spaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Package ${packageId2} not found`,
      );

      expect(mockPackageService.findById).toHaveBeenCalledTimes(2);
      expect(mockPackageService.deletePackages).not.toHaveBeenCalled();
    });

    it('throws error when one of the packages does not belong to specified space', async () => {
      const packageId1 = createPackageId('pkg-correct-space');
      const packageId2 = createPackageId('pkg-wrong-space');
      const correctSpaceId = createSpaceId('space-correct');
      const wrongSpaceId = createSpaceId('space-wrong');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');

      const package1 = packageFactory({
        id: packageId1,
        spaceId: correctSpaceId,
      });
      const package2 = packageFactory({
        id: packageId2,
        spaceId: wrongSpaceId,
      });

      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(package2);

      const command: DeletePackagesBatchCommand = {
        packageIds: [packageId1, packageId2],
        spaceId: correctSpaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Package ${packageId2} does not belong to space ${correctSpaceId}`,
      );

      expect(mockPackageService.findById).toHaveBeenCalledTimes(2);
      expect(mockPackageService.deletePackages).not.toHaveBeenCalled();
    });

    it('propagates error when service throws during deletion', async () => {
      const packageId1 = createPackageId('pkg-123');
      const packageId2 = createPackageId('pkg-456');
      const spaceId = createSpaceId('space-999');
      const userId = createUserId('user-111');
      const organizationId = createOrganizationId('org-222');

      const package1 = packageFactory({ id: packageId1, spaceId });
      const package2 = packageFactory({ id: packageId2, spaceId });

      const serviceError = new Error('Database transaction failed');
      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(package2);
      mockPackageService.deletePackages.mockRejectedValue(serviceError);

      const command: DeletePackagesBatchCommand = {
        packageIds: [packageId1, packageId2],
        spaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        'Database transaction failed',
      );

      expect(mockPackageService.findById).toHaveBeenCalledTimes(2);
      expect(mockPackageService.deletePackages).toHaveBeenCalledWith(
        [packageId1, packageId2],
        userId,
      );
    });

    it('validates all packages before attempting deletion', async () => {
      const packageId1 = createPackageId('pkg-123');
      const packageId2 = createPackageId('pkg-456');
      const packageId3 = createPackageId('pkg-not-found');
      const spaceId = createSpaceId('space-999');
      const userId = createUserId('user-111');
      const organizationId = createOrganizationId('org-222');

      const package1 = packageFactory({ id: packageId1, spaceId });
      const package2 = packageFactory({ id: packageId2, spaceId });

      mockPackageService.findById
        .mockResolvedValueOnce(package1)
        .mockResolvedValueOnce(package2)
        .mockResolvedValueOnce(null);

      const command: DeletePackagesBatchCommand = {
        packageIds: [packageId1, packageId2, packageId3],
        spaceId,
        userId,
        organizationId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Package ${packageId3} not found`,
      );

      expect(mockPackageService.deletePackages).not.toHaveBeenCalled();
    });
  });
});
