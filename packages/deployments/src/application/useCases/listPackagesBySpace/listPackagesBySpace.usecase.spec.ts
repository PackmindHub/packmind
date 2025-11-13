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
import { IDeploymentsRepositories } from '../../../domain/repositories/IDeploymentsRepositories';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { v4 as uuidv4 } from 'uuid';

describe('ListPackagesBySpaceUsecase', () => {
  let useCase: ListPackagesBySpaceUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockRepositories: jest.Mocked<IDeploymentsRepositories>;
  let mockPackageRepository: jest.Mocked<IPackageRepository>;
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
    mockPackageRepository = {
      findBySpaceId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IPackageRepository>;

    mockRepositories = {
      getPackageRepository: jest.fn().mockReturnValue(mockPackageRepository),
      getTargetRepository: jest.fn(),
      getRecipesDeploymentRepository: jest.fn(),
      getStandardsDeploymentRepository: jest.fn(),
      getRenderModeConfigurationRepository: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentsRepositories>;

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
      mockRepositories,
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
        mockPackageRepository.findBySpaceId.mockResolvedValue([
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
        expect(mockPackageRepository.findBySpaceId).toHaveBeenCalledWith(
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
        mockPackageRepository.findBySpaceId.mockResolvedValue([]);

        const command: ListPackagesBySpaceCommand = {
          userId,
          organizationId,
          spaceId,
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ packages: [] });
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageRepository.findBySpaceId).toHaveBeenCalledWith(
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
        expect(mockPackageRepository.findBySpaceId).not.toHaveBeenCalled();
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
        expect(mockPackageRepository.findBySpaceId).not.toHaveBeenCalled();
      });
    });

    describe('when repository operations fail', () => {
      it('throws the error from repository', async () => {
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId,
        };

        const error = new Error('Database connection failed');
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageRepository.findBySpaceId.mockRejectedValue(error);

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
