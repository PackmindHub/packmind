import { ListPackagesBySpaceUsecase } from './listPackagesBySpace.usecase';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  IAccountsPort,
  ISpacesPort,
  ListPackagesBySpaceCommand,
  Space,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { v4 as uuidv4 } from 'uuid';

describe('ListPackagesBySpaceUsecase', () => {
  let useCase: ListPackagesBySpaceUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  });

  const buildOrganization = () => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  });

  beforeEach(() => {
    mockPackageService = {
      getPackagesBySpaceId: jest.fn(),
      findById: jest.fn(),
      createPackage: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockServices = {
      getPackageService: jest.fn().mockReturnValue(mockPackageService),
      getTargetService: jest.fn(),
      getRenderModeConfigurationService: jest.fn(),
      getRepositories: jest.fn(),
    } as unknown as jest.Mocked<DeploymentsServices>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
      isMemberOf: jest.fn().mockResolvedValue(true),
      isAdminOf: jest.fn(),
      getOrganizationIdBySlug: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn(),
      getSpaceBySlug: jest.fn(),
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    useCase = new ListPackagesBySpaceUsecase(
      mockAccountsPort,
      mockServices,
      mockSpacesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when space exists and belongs to organization', () => {
      it('returns packages for the space', async () => {
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId,
        };

        const package1 = packageFactory({
          spaceId,
          name: 'Package 1',
        });
        const package2 = packageFactory({
          spaceId,
          name: 'Package 2',
        });

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.getPackagesBySpaceId.mockResolvedValue([
          package1,
          package2,
        ]);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ packages: [package1, package2] });
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageService.getPackagesBySpaceId).toHaveBeenCalledWith(
          spaceId,
        );
      });
    });

    describe('when space has no packages', () => {
      it('returns empty packages array', async () => {
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId,
        };

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.getPackagesBySpaceId.mockResolvedValue([]);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ packages: [] });
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageService.getPackagesBySpaceId).toHaveBeenCalledWith(
          spaceId,
        );
      });
    });

    describe('when space does not exist', () => {
      it('throws error', async () => {
        mockSpacesPort.getSpaceById.mockResolvedValue(null);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageService.getPackagesBySpaceId).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to different organization', () => {
      it('throws error', async () => {
        const differentOrgId = createOrganizationId(uuidv4());
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId: differentOrgId,
        };

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageService.getPackagesBySpaceId).not.toHaveBeenCalled();
      });
    });

    describe('when service operations fail', () => {
      it('throws the error from service', async () => {
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId,
        };

        const error = new Error('Database connection failed');
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.getPackagesBySpaceId.mockRejectedValue(error);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when spaces port fails', () => {
      it('throws the error from spaces port', async () => {
        const error = new Error('Spaces service unavailable');
        mockSpacesPort.getSpaceById.mockRejectedValue(error);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Spaces service unavailable',
        );
      });
    });
  });
});
