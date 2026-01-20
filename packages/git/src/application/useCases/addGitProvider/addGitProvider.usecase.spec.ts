import { AddGitProviderUseCase } from './addGitProvider.usecase';
import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderVendor,
  GitProviderVendors,
  createGitProviderId,
} from '@packmind/types';
import {
  IAccountsPort,
  createOrganizationId,
  createUserId,
  User,
  Organization,
} from '@packmind/types';
import { gitProviderFactory } from '../../../../test';
import { stubLogger } from '@packmind/test-utils';

describe('AddGitProviderUseCase', () => {
  let useCase: AddGitProviderUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  const organizationId = createOrganizationId('org-123');
  const adminUser: User = {
    id: createUserId('user-123'),
    email: 'admin@example.com',
    passwordHash: null,
    active: true,
    memberships: [
      {
        userId: createUserId('user-123'),
        organizationId,
        role: 'admin',
      },
    ],
  };
  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  beforeEach(() => {
    mockGitProviderService = {
      addGitProvider: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    accountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new AddGitProviderUseCase(
      mockGitProviderService,
      accountsAdapter,
      stubLogger(),
    );
  });

  describe('when adding git provider with organization association', () => {
    const input = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: 'test-token',
      },
      organizationId: organizationId,
      userId: adminUser.id,
    };

    let result: Awaited<ReturnType<typeof useCase.execute>>;
    let expectedResult: ReturnType<typeof gitProviderFactory>;

    beforeEach(async () => {
      expectedResult = gitProviderFactory({
        id: createGitProviderId('provider-123'),
        ...input.gitProvider,
        organizationId: input.organizationId,
      });

      mockGitProviderService.addGitProvider.mockResolvedValue(expectedResult);

      result = await useCase.execute(input);
    });

    it('returns the created git provider', () => {
      expect(result).toEqual(expectedResult);
    });

    it('calls addGitProvider with correct parameters', () => {
      expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith({
        ...input.gitProvider,
        organizationId: input.organizationId,
      });
    });

    it('retrieves user by id', () => {
      expect(accountsAdapter.getUserById).toHaveBeenCalledWith(input.userId);
    });
  });

  describe('when git provider token is missing', () => {
    const input = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: '',
      },
      organizationId: organizationId,
      userId: adminUser.id,
    };

    let thrownError: Error | null = null;

    beforeEach(async () => {
      thrownError = null;
      try {
        await useCase.execute(input);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    it('throws error', () => {
      expect(thrownError?.message).toBe('Git provider token is required');
    });

    it('does not call addGitProvider', () => {
      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('when git provider source is missing', () => {
    const input = {
      gitProvider: {
        source: undefined as unknown as GitProviderVendor,
        url: 'https://github.com',
        token: 'test-token',
      },
      organizationId: organizationId,
      userId: adminUser.id,
    };

    let thrownError: Error | null = null;

    beforeEach(async () => {
      thrownError = null;
      try {
        await useCase.execute(input);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    it('throws error', () => {
      expect(thrownError?.message).toBe('Git provider source is required');
    });

    it('does not call addGitProvider', () => {
      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('allowTokenlessProvider flag', () => {
    describe('when allowTokenlessProvider is true', () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: null,
        },
        organizationId: organizationId,
        userId: adminUser.id,
        allowTokenlessProvider: true,
      };

      let result: Awaited<ReturnType<typeof useCase.execute>>;
      let expectedResult: ReturnType<typeof gitProviderFactory>;

      beforeEach(async () => {
        expectedResult = gitProviderFactory({
          id: createGitProviderId('provider-123'),
          ...input.gitProvider,
          organizationId: input.organizationId,
        });

        mockGitProviderService.addGitProvider.mockResolvedValue(expectedResult);

        result = await useCase.execute(input);
      });

      it('returns the created git provider', () => {
        expect(result).toEqual(expectedResult);
      });

      it('calls addGitProvider', () => {
        expect(mockGitProviderService.addGitProvider).toHaveBeenCalled();
      });
    });

    describe('when allowTokenlessProvider is false', () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: null,
        },
        organizationId: organizationId,
        userId: adminUser.id,
        allowTokenlessProvider: false,
      };

      let thrownError: Error | null = null;

      beforeEach(async () => {
        thrownError = null;
        try {
          await useCase.execute(input);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error', () => {
        expect(thrownError?.message).toBe('Git provider token is required');
      });

      it('does not call addGitProvider', () => {
        expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
      });
    });

    describe('when allowTokenlessProvider is not provided', () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: null,
        },
        organizationId: organizationId,
        userId: adminUser.id,
      };

      let thrownError: Error | null = null;

      beforeEach(async () => {
        thrownError = null;
        try {
          await useCase.execute(input);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error', () => {
        expect(thrownError?.message).toBe('Git provider token is required');
      });

      it('does not call addGitProvider', () => {
        expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
      });
    });
  });
});
