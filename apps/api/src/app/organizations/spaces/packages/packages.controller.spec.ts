import { BadRequestException } from '@nestjs/common';
import {
  PackageNotFoundError,
  PackageReleaseNotFoundError,
  PackageReleaseRefusedError,
} from '@packmind/deployments';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createPackageId,
  createPackageReleaseId,
  createSpaceId,
  createUserId,
  CreatePackageReleaseResponse,
  GetPackageReleaseResponse,
  ListPackageReleasesResponse,
  PackageRelease,
} from '@packmind/types';
import { DeploymentsService } from '../../deployments/deployments.service';
import { OrganizationsSpacesPackagesController } from './packages.controller';

describe('OrganizationsSpacesPackagesController', () => {
  let controller: OrganizationsSpacesPackagesController;
  let deploymentsService: jest.Mocked<DeploymentsService>;
  let logger: jest.Mocked<PackmindLogger>;

  const organizationId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');
  const packageId = createPackageId('package-1');
  const userId = createUserId('user-1');

  const request = {
    user: { userId },
  } as unknown as AuthenticatedRequest;

  const release: PackageRelease = {
    id: createPackageReleaseId('release-1'),
    packageId,
    version: '1.1.0',
    name: 'Package',
    description: 'A package',
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
  };

  beforeEach(() => {
    deploymentsService = {
      listPackageReleases: jest.fn(),
      createPackageRelease: jest.fn(),
      getPackageRelease: jest.fn(),
    } as unknown as jest.Mocked<DeploymentsService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesPackagesController(
      deploymentsService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listPackageReleases', () => {
    const response: ListPackageReleasesResponse = {
      releases: [{ version: '1.0.0', releasedAt: null }],
      readiness: {
        currentVersion: '1.0.0',
        verdict: 'ready',
        nextVersions: ['1.0.1', '1.1.0', '2.0.0'],
        outdatedComponents: [],
      },
    };

    it('delegates the whole release-listing command to the service', async () => {
      deploymentsService.listPackageReleases.mockResolvedValue(response);

      await controller.listPackageReleases(
        organizationId,
        spaceId,
        packageId,
        request,
      );

      expect(deploymentsService.listPackageReleases).toHaveBeenCalledWith({
        userId,
        organizationId,
        spaceId,
        packageId,
      });
    });

    it('returns the release listing untouched', async () => {
      deploymentsService.listPackageReleases.mockResolvedValue(response);

      const result = await controller.listPackageReleases(
        organizationId,
        spaceId,
        packageId,
        request,
      );

      expect(result).toBe(response);
    });

    describe('when the package does not exist', () => {
      it('propagates the error for the filter to map', async () => {
        deploymentsService.listPackageReleases.mockRejectedValue(
          new PackageNotFoundError(packageId),
        );

        await expect(
          controller.listPackageReleases(
            organizationId,
            spaceId,
            packageId,
            request,
          ),
        ).rejects.toBeInstanceOf(PackageNotFoundError);
      });
    });
  });

  describe('createPackageRelease', () => {
    const response: CreatePackageReleaseResponse = { release };

    it('passes the submitted version through', async () => {
      deploymentsService.createPackageRelease.mockResolvedValue(response);

      await controller.createPackageRelease(
        organizationId,
        spaceId,
        packageId,
        request,
        { version: '1.1.0' },
      );

      expect(deploymentsService.createPackageRelease).toHaveBeenCalledWith({
        userId,
        organizationId,
        spaceId,
        packageId,
        version: '1.1.0',
      });
    });

    it('returns the created release untouched', async () => {
      deploymentsService.createPackageRelease.mockResolvedValue(response);

      const result = await controller.createPackageRelease(
        organizationId,
        spaceId,
        packageId,
        request,
        { version: '1.1.0' },
      );

      expect(result).toBe(response);
    });

    describe('when the cut is refused', () => {
      const cut = () => {
        deploymentsService.createPackageRelease.mockRejectedValue(
          new PackageReleaseRefusedError('not_greater', '1.2.0'),
        );

        return controller.createPackageRelease(
          organizationId,
          spaceId,
          packageId,
          request,
          { version: '1.1.0' },
        );
      };

      it('answers with a 400', async () => {
        await expect(cut()).rejects.toBeInstanceOf(BadRequestException);
      });

      it('carries the refusal code and the current version', async () => {
        const error = await cut().catch((caught) => caught);

        expect((error as BadRequestException).getResponse()).toEqual({
          message: 'Package release refused: not_greater',
          code: 'not_greater',
          currentVersion: '1.2.0',
        });
      });
    });

    describe('when the package does not exist', () => {
      it('propagates the error for the filter to map', async () => {
        deploymentsService.createPackageRelease.mockRejectedValue(
          new PackageNotFoundError(packageId),
        );

        await expect(
          controller.createPackageRelease(
            organizationId,
            spaceId,
            packageId,
            request,
            { version: '1.1.0' },
          ),
        ).rejects.toBeInstanceOf(PackageNotFoundError);
      });
    });
  });

  describe('getPackageRelease', () => {
    const response: GetPackageReleaseResponse = { release };

    it('passes the version param through', async () => {
      deploymentsService.getPackageRelease.mockResolvedValue(response);

      await controller.getPackageRelease(
        organizationId,
        spaceId,
        packageId,
        '1.1.0',
        request,
      );

      expect(deploymentsService.getPackageRelease).toHaveBeenCalledWith({
        userId,
        organizationId,
        spaceId,
        packageId,
        version: '1.1.0',
      });
    });

    it('returns the release untouched', async () => {
      deploymentsService.getPackageRelease.mockResolvedValue(response);

      const result = await controller.getPackageRelease(
        organizationId,
        spaceId,
        packageId,
        '1.1.0',
        request,
      );

      expect(result).toBe(response);
    });

    describe('when no release carries the requested version', () => {
      it('lets the error through for the filter to answer', async () => {
        deploymentsService.getPackageRelease.mockRejectedValue(
          new PackageReleaseNotFoundError(packageId, '9.9.9'),
        );

        await expect(
          controller.getPackageRelease(
            organizationId,
            spaceId,
            packageId,
            '9.9.9',
            request,
          ),
        ).rejects.toBeInstanceOf(PackageReleaseNotFoundError);
      });
    });
  });
});
