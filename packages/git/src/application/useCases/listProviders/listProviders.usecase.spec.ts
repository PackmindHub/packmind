import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Organization,
  User,
} from '@packmind/types';
import { gitProviderFactory } from '../../../../test';
import { GitProviderService } from '../../GitProviderService';
import { ListProvidersUseCase } from './listProviders.usecase';

describe('ListProvidersUseCase', () => {
  let useCase: ListProvidersUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-123');

  const user: User = {
    id: userId,
    email: 'test@example.com',
    passwordHash: null,
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member',
      },
    ],
  };

  const organization: Organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    mockGitProviderService = {
      findGitProvidersByOrganizationId: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ListProvidersUseCase(
      mockAccountsPort,
      mockGitProviderService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when providers exist', () => {
    describe('with token set', () => {
      it('returns providers with hasToken true', async () => {
        const provider = gitProviderFactory({
          organizationId,
          token: 'valid-token',
        });
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [provider],
        );

        const result = await useCase.execute({ organizationId, userId });

        expect(result.providers).toEqual([
          {
            id: provider.id,
            source: provider.source,
            organizationId: provider.organizationId,
            url: provider.url,
            hasToken: true,
          },
        ]);
      });

      it('does not include token in response', async () => {
        const provider = gitProviderFactory({
          organizationId,
          token: 'secret-token',
        });
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [provider],
        );

        const result = await useCase.execute({ organizationId, userId });

        expect(result.providers[0]).not.toHaveProperty('token');
      });
    });

    describe('with token null', () => {
      it('returns providers with hasToken false', async () => {
        const provider = gitProviderFactory({
          organizationId,
          token: null,
        });
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [provider],
        );

        const result = await useCase.execute({ organizationId, userId });

        expect(result.providers[0].hasToken).toBe(false);
      });
    });

    describe('with token empty string', () => {
      it('returns providers with hasToken false', async () => {
        const provider = gitProviderFactory({
          organizationId,
          token: '',
        });
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [provider],
        );

        const result = await useCase.execute({ organizationId, userId });

        expect(result.providers[0].hasToken).toBe(false);
      });
    });

    describe('with mixed token states', () => {
      it('returns correct hasToken for each provider', async () => {
        const providerWithToken = gitProviderFactory({
          organizationId,
          token: 'valid-token',
        });
        const providerWithoutToken = gitProviderFactory({
          organizationId,
          token: null,
        });
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [providerWithToken, providerWithoutToken],
        );

        const result = await useCase.execute({ organizationId, userId });

        expect(result.providers[0].hasToken).toBe(true);
        expect(result.providers[1].hasToken).toBe(false);
      });
    });
  });

  describe('when no providers exist', () => {
    it('returns empty providers array', async () => {
      mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
        [],
      );

      const result = await useCase.execute({ organizationId, userId });

      expect(result.providers).toEqual([]);
    });
  });

  describe('when user is not found', () => {
    it('throws UserNotFoundError', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(null);

      await expect(
        useCase.execute({ organizationId, userId }),
      ).rejects.toThrow();
    });

    it('does not call git provider service', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(null);

      try {
        await useCase.execute({ organizationId, userId });
      } catch {
        // Expected to throw
      }

      expect(
        mockGitProviderService.findGitProvidersByOrganizationId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when user is not in organization', () => {
    it('throws UserNotInOrganizationError', async () => {
      const userNotInOrg: User = {
        ...user,
        memberships: [],
      };
      mockAccountsPort.getUserById.mockResolvedValue(userNotInOrg);

      await expect(
        useCase.execute({ organizationId, userId }),
      ).rejects.toThrow();
    });

    it('does not call git provider service', async () => {
      const userNotInOrg: User = {
        ...user,
        memberships: [],
      };
      mockAccountsPort.getUserById.mockResolvedValue(userNotInOrg);

      try {
        await useCase.execute({ organizationId, userId });
      } catch {
        // Expected to throw
      }

      expect(
        mockGitProviderService.findGitProvidersByOrganizationId,
      ).not.toHaveBeenCalled();
    });
  });
});
