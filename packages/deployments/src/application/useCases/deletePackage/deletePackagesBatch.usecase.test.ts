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
    describe('when deleting multiple packages that all exist and belong to the specified space', () => {
      const packageId1 = createPackageId('pkg-123');
      const packageId2 = createPackageId('pkg-456');
      const packageId3 = createPackageId('pkg-789');
      const spaceId = createSpaceId('space-999');
      const userId = createUserId('user-111');
      const organizationId = createOrganizationId('org-222');

      beforeEach(async () => {
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

        await usecase.execute(command);
      });

      it('calls findById for each package', () => {
        expect(mockPackageService.findById).toHaveBeenCalledTimes(3);
      });

      it('looks up first package by id', () => {
        expect(mockPackageService.findById).toHaveBeenCalledWith(packageId1);
      });

      it('looks up second package by id', () => {
        expect(mockPackageService.findById).toHaveBeenCalledWith(packageId2);
      });

      it('looks up third package by id', () => {
        expect(mockPackageService.findById).toHaveBeenCalledWith(packageId3);
      });

      it('deletes all packages with the user id', () => {
        expect(mockPackageService.deletePackages).toHaveBeenCalledWith(
          [packageId1, packageId2, packageId3],
          userId,
        );
      });
    });

    describe('when deleting a single package', () => {
      const packageId = createPackageId('pkg-single');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');
      let result: Record<string, never>;

      beforeEach(async () => {
        const existingPackage = packageFactory({ id: packageId, spaceId });

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockPackageService.deletePackages.mockResolvedValue();

        const command: DeletePackagesBatchCommand = {
          packageIds: [packageId],
          spaceId,
          userId,
          organizationId,
        };

        result = await usecase.execute(command);
      });

      it('looks up the package by id', () => {
        expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      });

      it('deletes the package with the user id', () => {
        expect(mockPackageService.deletePackages).toHaveBeenCalledWith(
          [packageId],
          userId,
        );
      });

      it('returns an empty object', () => {
        expect(result).toEqual({});
      });
    });

    describe('when one of the packages does not exist', () => {
      const packageId1 = createPackageId('pkg-exists');
      const packageId2 = createPackageId('pkg-not-found');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');
      let executePromise: Promise<Record<string, never>>;

      beforeEach(() => {
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

        executePromise = usecase.execute(command);
      });

      it('throws a not found error', async () => {
        await expect(executePromise).rejects.toThrow(
          `Package ${packageId2} not found`,
        );
      });

      it('calls findById for both packages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.findById).toHaveBeenCalledTimes(2);
      });

      it('does not call deletePackages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.deletePackages).not.toHaveBeenCalled();
      });
    });

    describe('when one of the packages does not belong to specified space', () => {
      const packageId1 = createPackageId('pkg-correct-space');
      const packageId2 = createPackageId('pkg-wrong-space');
      const correctSpaceId = createSpaceId('space-correct');
      const wrongSpaceId = createSpaceId('space-wrong');
      const userId = createUserId('user-789');
      const organizationId = createOrganizationId('org-999');
      let executePromise: Promise<Record<string, never>>;

      beforeEach(() => {
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

        executePromise = usecase.execute(command);
      });

      it('throws an error about wrong space', async () => {
        await expect(executePromise).rejects.toThrow(
          `Package ${packageId2} does not belong to space ${correctSpaceId}`,
        );
      });

      it('calls findById for both packages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.findById).toHaveBeenCalledTimes(2);
      });

      it('does not call deletePackages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.deletePackages).not.toHaveBeenCalled();
      });
    });

    describe('when service throws during deletion', () => {
      const packageId1 = createPackageId('pkg-123');
      const packageId2 = createPackageId('pkg-456');
      const spaceId = createSpaceId('space-999');
      const userId = createUserId('user-111');
      const organizationId = createOrganizationId('org-222');
      let executePromise: Promise<Record<string, never>>;

      beforeEach(() => {
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

        executePromise = usecase.execute(command);
      });

      it('propagates the error', async () => {
        await expect(executePromise).rejects.toThrow(
          'Database transaction failed',
        );
      });

      it('calls findById for both packages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.findById).toHaveBeenCalledTimes(2);
      });

      it('attempts to delete the packages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.deletePackages).toHaveBeenCalledWith(
          [packageId1, packageId2],
          userId,
        );
      });
    });

    describe('when validating all packages before deletion', () => {
      const packageId1 = createPackageId('pkg-123');
      const packageId2 = createPackageId('pkg-456');
      const packageId3 = createPackageId('pkg-not-found');
      const spaceId = createSpaceId('space-999');
      const userId = createUserId('user-111');
      const organizationId = createOrganizationId('org-222');
      let executePromise: Promise<Record<string, never>>;

      beforeEach(() => {
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

        executePromise = usecase.execute(command);
      });

      it('throws error for missing package', async () => {
        await expect(executePromise).rejects.toThrow(
          `Package ${packageId3} not found`,
        );
      });

      it('does not call deletePackages', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.deletePackages).not.toHaveBeenCalled();
      });
    });
  });
});
