import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  createOrganizationId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { CheckBranchExistsUseCase } from './checkBranchExists.usecase';

describe('CheckBranchExistsUseCase', () => {
  let useCase: CheckBranchExistsUseCase;
  let mockGitProviderService: jest.Mocked<
    Pick<GitProviderService, 'findGitProviderById' | 'checkBranchExists'>
  >;

  const providerId: GitProviderId = createGitProviderId(
    'de754fed-7659-4816-95c6-12e3a0b9e3c9',
  );
  const organizationId = createOrganizationId(
    '19fe905e-ccc6-45ab-b484-d08dd991f9c0',
  );

  const tokenProvider: GitProvider = {
    id: providerId,
    source: 'github',
    authMethod: 'token',
    url: 'https://github.com',
    token: 'ghp_xxx',
    organizationId,
  } as GitProvider;

  const appProvider: GitProvider = {
    id: providerId,
    source: 'github',
    authMethod: 'app',
    appInstallationId: 12345,
    url: null,
    token: null,
    organizationId,
  } as GitProvider;

  const args = { owner: 'acme', repo: 'repo-a', branch: 'main' };

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
      checkBranchExists: jest.fn(),
    };

    useCase = new CheckBranchExistsUseCase(
      mockGitProviderService as unknown as GitProviderService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when authMethod is "token"', () => {
    it('rejects when the provider has no token', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue({
        ...tokenProvider,
        token: null,
      } as GitProvider);

      await expect(
        useCase.execute({ gitProviderId: providerId, ...args }),
      ).rejects.toThrow('Git provider token not configured');
      expect(mockGitProviderService.checkBranchExists).not.toHaveBeenCalled();
    });

    it('delegates to checkBranchExists when the token is present', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        tokenProvider,
      );
      mockGitProviderService.checkBranchExists.mockResolvedValue(true);

      const result = await useCase.execute({
        gitProviderId: providerId,
        ...args,
      });

      expect(result).toBe(true);
      expect(mockGitProviderService.checkBranchExists).toHaveBeenCalledWith(
        providerId,
        args.owner,
        args.repo,
        args.branch,
      );
    });
  });

  describe('when authMethod is "app"', () => {
    it('delegates to checkBranchExists even though token is null', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(appProvider);
      mockGitProviderService.checkBranchExists.mockResolvedValue(true);

      const result = await useCase.execute({
        gitProviderId: providerId,
        ...args,
      });

      expect(result).toBe(true);
      expect(mockGitProviderService.checkBranchExists).toHaveBeenCalledWith(
        providerId,
        args.owner,
        args.repo,
        args.branch,
      );
    });
  });

  describe('input validation', () => {
    it('rejects when gitProviderId is missing', async () => {
      await expect(
        useCase.execute({
          gitProviderId: undefined as unknown as GitProviderId,
          ...args,
        }),
      ).rejects.toThrow('Git provider ID is required');
    });

    it('rejects when the provider does not exist', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(
        useCase.execute({ gitProviderId: providerId, ...args }),
      ).rejects.toThrow('Git provider not found');
    });
  });
});
