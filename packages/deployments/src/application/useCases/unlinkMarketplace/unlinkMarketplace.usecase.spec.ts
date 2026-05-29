import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createGitRepoId,
  createMarketplaceId,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  IGitPort,
  Marketplace,
  MarketplaceId,
  MarketplaceNotFoundError,
  MarketplaceUnlinkedEvent,
  Organization,
  OrganizationId,
  UnlinkMarketplaceCommand,
  User,
  UserId,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { UnlinkMarketplaceUseCase } from './unlinkMarketplace.usecase';

describe('UnlinkMarketplaceUseCase', () => {
  const organizationId: OrganizationId = createOrganizationId(uuidv4());
  const userId: UserId = createUserId(uuidv4());
  const marketplaceId: MarketplaceId = createMarketplaceId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());

  const command: UnlinkMarketplaceCommand = {
    userId,
    organizationId,
    marketplaceId,
  };

  const existingMarketplace = {
    id: marketplaceId,
    organizationId,
    gitRepoId,
    name: 'ACME Plugins',
    vendor: 'anthropic',
    addedBy: userId,
    linkedAt: new Date(),
    state: 'healthy',
    lastValidatedAt: null,
    descriptor: {
      vendor: 'anthropic',
      name: 'ACME Plugins',
      plugins: [],
      raw: {},
    },
    pluginCount: 0,
  } as unknown as Marketplace;

  const adminUser = {
    id: userId,
    email: 'admin@example.com',
    displayName: 'Admin User',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'admin' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: UnlinkMarketplaceUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(existingMarketplace),
      deleteById: jest.fn().mockResolvedValue(undefined),
      add: jest.fn(),
      addMany: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByOrganizationAndGitRepo: jest.fn(),
      findAllForReconciliation: jest.fn(),
      updateState: jest.fn(),
      findById: jest.fn(),
      restoreById: jest.fn(),
      hardDeleteById: jest.fn(),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockGitPort = {
      deleteGitRepo: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IGitPort>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new UnlinkMarketplaceUseCase(
      mockMarketplaceRepository,
      mockGitPort,
      mockEventEmitterService,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('admin happy path', () => {
    it('soft-deletes the marketplace and underlying git repo', async () => {
      const response = await useCase.execute(command);

      expect(mockMarketplaceRepository.deleteById).toHaveBeenCalledWith(
        marketplaceId,
        userId,
      );
      expect(mockGitPort.deleteGitRepo).toHaveBeenCalledWith(
        gitRepoId,
        userId,
        organizationId,
      );
      expect(response.marketplaceId).toBe(marketplaceId);
    });

    it('emits MarketplaceUnlinkedEvent', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
      const emitted = mockEventEmitterService.emit.mock.calls[0][0];
      expect(emitted).toBeInstanceOf(MarketplaceUnlinkedEvent);
      expect(emitted.payload.marketplaceId).toBe(marketplaceId);
      expect(emitted.payload.gitRepoId).toBe(gitRepoId);
      expect(emitted.payload.organizationId).toBe(organizationId);
    });
  });

  describe('non-admin denial', () => {
    beforeEach(() => {
      const memberUser = {
        ...adminUser,
        memberships: [{ userId, organizationId, role: 'member' as const }],
      } as unknown as User;
      mockAccountsPort.getUserById = jest.fn().mockResolvedValue(memberUser);
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: 'OrganizationAdminRequiredError',
      });
    });

    it('does not delete anything', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // expected
      }
      expect(mockMarketplaceRepository.deleteById).not.toHaveBeenCalled();
      expect(mockGitPort.deleteGitRepo).not.toHaveBeenCalled();
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('marketplace not found', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws MarketplaceNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        MarketplaceNotFoundError,
      );
    });

    it('does not delete or emit', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // expected
      }
      expect(mockMarketplaceRepository.deleteById).not.toHaveBeenCalled();
      expect(mockGitPort.deleteGitRepo).not.toHaveBeenCalled();
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });
});
