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
    describe('when the provider has no token', () => {
      beforeEach(() => {
        mockGitProviderService.findGitProviderById.mockResolvedValue({
          ...tokenProvider,
          token: null,
        } as GitProvider);
      });

      it('rejects', async () => {
        await expect(
          useCase.execute({ gitProviderId: providerId, ...args }),
        ).rejects.toThrow('Git provider token not configured');
      });

      it('does not call checkBranchExists', async () => {
        await useCase
          .execute({ gitProviderId: providerId, ...args })
          .catch(() => undefined);
        expect(mockGitProviderService.checkBranchExists).not.toHaveBeenCalled();
      });
    });

    describe('when the token is present', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          tokenProvider,
        );
        mockGitProviderService.checkBranchExists.mockResolvedValue(true);

        result = await useCase.execute({
          gitProviderId: providerId,
          ...args,
        });
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('delegates to checkBranchExists', () => {
        expect(mockGitProviderService.checkBranchExists).toHaveBeenCalledWith(
          providerId,
          args.owner,
          args.repo,
          args.branch,
        );
      });
    });
  });

  describe('when authMethod is "app"', () => {
    describe('when token is null', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          appProvider,
        );
        mockGitProviderService.checkBranchExists.mockResolvedValue(true);

        result = await useCase.execute({
          gitProviderId: providerId,
          ...args,
        });
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('delegates to checkBranchExists', () => {
        expect(mockGitProviderService.checkBranchExists).toHaveBeenCalledWith(
          providerId,
          args.owner,
          args.repo,
          args.branch,
        );
      });
    });
  });

  describe('input validation', () => {
    describe('when gitProviderId is missing', () => {
      it('rejects', async () => {
        await expect(
          useCase.execute({
            gitProviderId: undefined as unknown as GitProviderId,
            ...args,
          }),
        ).rejects.toThrow('Git provider ID is required');
      });
    });

    describe('when the provider does not exist', () => {
      it('rejects', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(null);

        await expect(
          useCase.execute({ gitProviderId: providerId, ...args }),
        ).rejects.toThrow('Git provider not found');
      });
    });
  });
});
