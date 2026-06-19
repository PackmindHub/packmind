import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  ListMarketplaceDistributionsForPackageCommand,
  Organization,
  Package,
  Space,
  SpaceType,
  User,
} from '@packmind/types';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';
import { marketplaceDistributionFactory } from '../../../infra/repositories/__factories__/marketplaceDistributionFactory';
import { ListMarketplaceDistributionsForPackageUseCase } from './ListMarketplaceDistributionsForPackageUseCase';

describe('ListMarketplaceDistributionsForPackageUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const command: ListMarketplaceDistributionsForPackageCommand = {
    userId,
    organizationId,
    packageId,
  };

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    displayName: 'Member',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const pkg: Package = {
    id: packageId,
    name: 'Security',
    slug: 'security',
    description: 'Security curated package',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
    skills: [],
  };

  const space: Space = {
    id: spaceId,
    name: 'Default',
    slug: 'default',
    type: SpaceType.open,
    organizationId,
    isDefaultSpace: true,
    color: 'blue' as Space['color'],
  };

  const olderRow = marketplaceDistributionFactory({
    packageId,
    organizationId,
  });
  const newerRow = marketplaceDistributionFactory({
    packageId,
    organizationId,
  });

  let mockRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: ListMarketplaceDistributionsForPackageUseCase;

  beforeEach(() => {
    mockRepository = {
      findByPackageId: jest.fn().mockResolvedValue([newerRow, olderRow]),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockPackageService = {
      findById: jest.fn().mockResolvedValue(pkg),
    } as unknown as jest.Mocked<PackageService>;

    mockSpacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(space),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ListMarketplaceDistributionsForPackageUseCase(
      mockRepository,
      mockPackageService,
      mockSpacesPort,
      mockAccountsPort,
      stubLogger(),
    );
  });

  describe('happy path', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute(command);
    });

    it('returns the rows in repository order (descending by createdAt)', () => {
      expect(result).toEqual([newerRow, olderRow]);
    });

    it('scopes the lookup by packageId', () => {
      expect(mockRepository.findByPackageId).toHaveBeenCalledWith(packageId);
    });
  });

  describe('when the package is unknown', () => {
    beforeEach(() => {
      mockPackageService.findById.mockResolvedValue(null);
    });

    it('throws PackageNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        PackageNotFoundError,
      );
    });
  });

  describe('when the package belongs to a different organization', () => {
    beforeEach(() => {
      mockSpacesPort.getSpaceById.mockResolvedValue({
        ...space,
        organizationId: createOrganizationId(uuidv4()),
      } as Space);
    });

    it('throws PackageNotFoundError to avoid leaking cross-org existence', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        PackageNotFoundError,
      );
    });
  });
});
