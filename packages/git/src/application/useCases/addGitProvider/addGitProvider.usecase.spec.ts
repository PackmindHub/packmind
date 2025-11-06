import { AddGitProviderUseCase } from './addGitProvider.usecase';
import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderVendor,
  GitProviderVendors,
  createGitProviderId,
} from '../../../domain/entities/GitProvider';
import {
  UserProvider,
  OrganizationProvider,
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
  let userProvider: jest.Mocked<UserProvider>;
  let organizationProvider: jest.Mocked<OrganizationProvider>;
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

    userProvider = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
    } as jest.Mocked<UserProvider>;

    organizationProvider = {
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as jest.Mocked<OrganizationProvider>;

    useCase = new AddGitProviderUseCase(
      mockGitProviderService,
      userProvider,
      organizationProvider,
      stubLogger(),
    );
  });

  it('adds git provider with organization association', async () => {
    const input = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: 'test-token',
      },
      organizationId: organizationId,
      userId: adminUser.id,
    };

    const expectedResult = gitProviderFactory({
      id: createGitProviderId('provider-123'),
      ...input.gitProvider,
      organizationId: input.organizationId,
    });

    mockGitProviderService.addGitProvider.mockResolvedValue(expectedResult);

    const result = await useCase.execute(input);

    expect(result).toEqual(expectedResult);
    expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith({
      ...input.gitProvider,
      organizationId: input.organizationId,
    });
    expect(userProvider.getUserById).toHaveBeenCalledWith(input.userId);
  });

  describe('when git provider token is missing', () => {
    it('throws error', async () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: '',
        },
        organizationId: organizationId,
        userId: adminUser.id,
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Git provider token is required',
      );

      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('when git provider source is missing', () => {
    it('throws error', async () => {
      const input = {
        gitProvider: {
          source: undefined as unknown as GitProviderVendor,
          url: 'https://github.com',
          token: 'test-token',
        },
        organizationId: organizationId,
        userId: adminUser.id,
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Git provider source is required',
      );

      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });
});
