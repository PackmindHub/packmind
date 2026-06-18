import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  Marketplace,
  Organization,
  OrganizationId,
  User,
  UserOrganizationMembership,
  createMarketplaceId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IPluginInstallationRepository } from '../../../domain/repositories/IPluginInstallationRepository';
import { ListMarketplacePluginInstallsUseCase } from './ListMarketplacePluginInstallsUseCase';

const createUserWithMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [
    {
      userId: createUserId(userId),
      organizationId: organization.id,
      role,
    },
  ],
  trial: false,
});

describe('ListMarketplacePluginInstallsUseCase', () => {
  let pluginInstallationRepository: jest.Mocked<IPluginInstallationRepository>;
  let marketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let useCase: ListMarketplacePluginInstallsUseCase;
  let organizationId: OrganizationId;
  let organization: Organization;
  let userId: string;
  let marketplaceId: ReturnType<typeof createMarketplaceId>;

  const buildCommand = () => ({
    userId,
    organizationId: organizationId as unknown as string,
    marketplaceId,
  });

  beforeEach(() => {
    userId = uuidv4();
    organizationId = createOrganizationId(uuidv4());
    marketplaceId = createMarketplaceId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    pluginInstallationRepository = {
      upsertHeartbeat: jest.fn(),
      listByMarketplace: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IPluginInstallationRepository>;

    marketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue({
        id: marketplaceId,
        organizationId,
      } as Marketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    accountsPort = {
      getUserById: jest
        .fn()
        .mockResolvedValue(
          createUserWithMembership(userId, organization, 'member'),
        ),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ListMarketplacePluginInstallsUseCase(
      pluginInstallationRepository,
      marketplaceRepository,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the caller is not a member of the organization', () => {
    beforeEach(() => {
      accountsPort.getUserById.mockResolvedValue(null);
    });

    it('rejects with an authorization error', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow();
    });
  });

  describe('when the marketplace does not belong to the caller organization', () => {
    beforeEach(() => {
      marketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws a MarketplaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toMatchObject({
        name: 'MarketplaceNotFoundError',
      });
    });

    it('does not call the installation repository', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(
        pluginInstallationRepository.listByMarketplace,
      ).not.toHaveBeenCalled();
    });
  });
});
