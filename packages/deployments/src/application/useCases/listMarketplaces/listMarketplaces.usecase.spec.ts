import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitRepoId,
  createMarketplaceId,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ListMarketplacesCommand,
  Marketplace,
  Organization,
  OrganizationId,
  User,
  UserId,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { ListMarketplacesUseCase } from './listMarketplaces.usecase';

describe('ListMarketplacesUseCase', () => {
  const organizationId: OrganizationId = createOrganizationId(uuidv4());
  const userId: UserId = createUserId(uuidv4());
  const otherUserId: UserId = createUserId(uuidv4());

  const command: ListMarketplacesCommand = {
    userId,
    organizationId,
  };

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    displayName: 'Member User',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const otherAdmin = {
    id: otherUserId,
    email: 'other-admin@example.com',
    displayName: 'Other Admin',
    passwordHash: null,
    active: true,
    memberships: [
      { userId: otherUserId, organizationId, role: 'admin' as const },
    ],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const m1 = {
    id: createMarketplaceId(uuidv4()),
    organizationId,
    gitRepoId: createGitRepoId(uuidv4()),
    name: 'ACME Plugins',
    vendor: 'anthropic',
    addedBy: otherUserId,
    linkedAt: new Date('2026-01-15'),
    state: 'healthy',
    lastValidatedAt: new Date(),
    descriptor: {
      vendor: 'anthropic',
      name: 'ACME Plugins',
      plugins: [{ slug: 'p1', name: 'P1' }],
      raw: {},
    },
    pluginCount: 1,
  } as unknown as Marketplace;

  const m2 = {
    ...m1,
    id: createMarketplaceId(uuidv4()),
    gitRepoId: createGitRepoId(uuidv4()),
    name: 'Other Plugins',
    state: 'drift',
    pluginCount: 4,
  } as unknown as Marketplace;

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: ListMarketplacesUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationId: jest.fn().mockResolvedValue([m1, m2]),
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      findByOrganizationAndGitRepo: jest.fn(),
      findByOrganizationAndId: jest.fn(),
      findAllForReconciliation: jest.fn(),
      updateState: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      hardDeleteById: jest.fn(),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockAccountsPort = {
      getUserById: jest.fn().mockImplementation(async (id: UserId) => {
        if (id === userId) return memberUser;
        if (id === otherUserId) return otherAdmin;
        return null;
      }),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ListMarketplacesUseCase(
      mockMarketplaceRepository,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('member happy path', () => {
    describe('hydrated marketplace list items', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(command);
      });

      it('returns one item per linked marketplace', () => {
        expect(result).toHaveLength(2);
      });

      it('hydrates the first marketplace', () => {
        expect(result[0]).toMatchObject({
          id: m1.id,
          name: 'ACME Plugins',
          state: 'healthy',
          pluginCount: 1,
          addedByUserName: otherAdmin.displayName,
        });
      });

      it('hydrates the second marketplace', () => {
        expect(result[1]).toMatchObject({
          id: m2.id,
          state: 'drift',
          pluginCount: 4,
          addedByUserName: otherAdmin.displayName,
        });
      });
    });

    describe('denormalized pluginCount from the row', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(command);
      });

      it('preserves the pluginCount of the first marketplace', () => {
        expect(result[0].pluginCount).toBe(1);
      });

      it('preserves the pluginCount of the second marketplace', () => {
        expect(result[1].pluginCount).toBe(4);
      });
    });

    it('de-duplicates user lookups for marketplaces added by the same user', async () => {
      await useCase.execute(command);

      // Both m1 and m2 share `addedBy = otherUserId`. The member's own user
      // is fetched once by AbstractMemberUseCase, and the addedBy user is
      // fetched once by the use case body — so two getUserById calls total.
      expect(mockAccountsPort.getUserById).toHaveBeenCalledTimes(2);
    });

    describe('when no marketplaces are linked', () => {
      it('returns an empty list', async () => {
        mockMarketplaceRepository.findByOrganizationId.mockResolvedValue([]);

        const result = await useCase.execute(command);

        expect(result).toEqual([]);
      });
    });
  });

  describe('non-member denial', () => {
    beforeEach(() => {
      const outsider = {
        ...memberUser,
        memberships: [],
      } as unknown as User;
      mockAccountsPort.getUserById = jest.fn().mockResolvedValue(outsider);
    });

    it('throws UserNotInOrganizationError', async () => {
      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: 'UserNotInOrganizationError',
      });
    });

    it('does not query the marketplace repository', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // expected
      }
      expect(
        mockMarketplaceRepository.findByOrganizationId,
      ).not.toHaveBeenCalled();
    });
  });
});
