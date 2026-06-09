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
import { MarketplaceReconciliationDelayedJob } from '../../jobs/MarketplaceReconciliationDelayedJob';
import { UnlinkMarketplaceUseCase } from './UnlinkMarketplaceUseCase';

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
  let mockReconciliationJob: jest.Mocked<MarketplaceReconciliationDelayedJob>;
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

    mockReconciliationJob = {
      scheduleRecurring: jest.fn().mockResolvedValue(undefined),
      cancelRecurring: jest.fn().mockResolvedValue(undefined),
      addJob: jest.fn().mockResolvedValue('job-id'),
    } as unknown as jest.Mocked<MarketplaceReconciliationDelayedJob>;

    useCase = new UnlinkMarketplaceUseCase(
      mockMarketplaceRepository,
      mockGitPort,
      mockEventEmitterService,
      mockReconciliationJob,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('admin happy path', () => {
    describe('soft-deletion of the marketplace and underlying git repo', () => {
      let response: Awaited<ReturnType<UnlinkMarketplaceUseCase['execute']>>;

      beforeEach(async () => {
        response = await useCase.execute(command);
      });

      it('soft-deletes the marketplace', () => {
        expect(mockMarketplaceRepository.deleteById).toHaveBeenCalledWith(
          marketplaceId,
          userId,
        );
      });

      it('deletes the underlying git repo', () => {
        expect(mockGitPort.deleteGitRepo).toHaveBeenCalledWith(
          gitRepoId,
          userId,
          organizationId,
        );
      });

      it('returns the marketplace id', () => {
        expect(response.marketplaceId).toBe(marketplaceId);
      });
    });

    describe('emitting MarketplaceUnlinkedEvent', () => {
      beforeEach(async () => {
        await useCase.execute(command);
      });

      it('emits exactly one event', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
      });

      it('emits a MarketplaceUnlinkedEvent instance', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted).toBeInstanceOf(MarketplaceUnlinkedEvent);
      });

      it('emits the marketplace id in the payload', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted.payload.marketplaceId).toBe(marketplaceId);
      });

      it('emits the git repo id in the payload', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted.payload.gitRepoId).toBe(gitRepoId);
      });

      it('emits the organization id in the payload', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted.payload.organizationId).toBe(organizationId);
      });
    });

    it('cancels the repeatable reconciliation cron via the job manager', async () => {
      await useCase.execute(command);

      expect(mockReconciliationJob.cancelRecurring).toHaveBeenCalledWith(
        marketplaceId,
      );
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

    describe('does not delete anything', () => {
      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch {
          // expected
        }
      });

      it('does not delete the marketplace', () => {
        expect(mockMarketplaceRepository.deleteById).not.toHaveBeenCalled();
      });

      it('does not delete the git repo', () => {
        expect(mockGitPort.deleteGitRepo).not.toHaveBeenCalled();
      });

      it('does not emit any event', () => {
        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
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

    describe('does not delete or emit', () => {
      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch {
          // expected
        }
      });

      it('does not delete the marketplace', () => {
        expect(mockMarketplaceRepository.deleteById).not.toHaveBeenCalled();
      });

      it('does not delete the git repo', () => {
        expect(mockGitPort.deleteGitRepo).not.toHaveBeenCalled();
      });

      it('does not emit any event', () => {
        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });
});
