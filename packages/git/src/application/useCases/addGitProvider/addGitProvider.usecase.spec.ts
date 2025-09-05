import { AddGitProviderUseCase } from './addGitProvider.usecase';
import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderVendor,
  GitProviderVendors,
  createGitProviderId,
} from '../../../domain/entities/GitProvider';
import { createOrganizationId } from '@packmind/accounts';
import { gitProviderFactory } from '../../../../test';

describe('AddGitProviderUseCase', () => {
  let useCase: AddGitProviderUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;

  beforeEach(() => {
    mockGitProviderService = {
      addGitProvider: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    useCase = new AddGitProviderUseCase(mockGitProviderService);
  });

  it('adds git provider with organization association', async () => {
    const input = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: 'test-token',
      },
      organizationId: createOrganizationId('org-123'),
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
  });

  describe('when organization ID is missing', () => {
    it('throws error', async () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: 'test-token',
        },
        organizationId: createOrganizationId(''),
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Organization ID is required to add a git provider',
      );

      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('when git provider token is missing', () => {
    it('throws error', async () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: '',
        },
        organizationId: createOrganizationId('org-123'),
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
        organizationId: createOrganizationId('org-123'),
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Git provider source is required',
      );

      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });
});
