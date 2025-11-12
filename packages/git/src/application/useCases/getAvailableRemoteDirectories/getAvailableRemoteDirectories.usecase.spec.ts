import { Cache } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  GetAvailableRemoteDirectoriesCommand,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { createGitProviderId } from '@packmind/types';
import { GitRepo, createGitRepoId } from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GetAvailableRemoteDirectoriesUseCase } from './getAvailableRemoteDirectories.usecase';

// Mock Cache
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Cache: {
    getInstance: jest.fn(),
  },
}));

// Get the mocked Cache after the mock
const mockCacheInstance = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
} as jest.Mocked<Pick<Cache, 'get' | 'set' | 'invalidate'>>;
const MockedCache = Cache as jest.Mocked<typeof Cache>;

describe('GetAvailableTargetsUseCase', () => {
  let getAvailableTargetsUseCase: GetAvailableRemoteDirectoriesUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;

  beforeEach(() => {
    mockGitProviderService = {
      addGitProvider: jest.fn(),
      findGitProviderById: jest.fn(),
      findGitProvidersByOrganizationId: jest.fn(),
      updateGitProvider: jest.fn(),
      deleteGitProvider: jest.fn(),
      getAvailableRepos: jest.fn(),
      checkBranchExists: jest.fn(),
      listAvailableTargets: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    // Setup cache mock
    MockedCache.getInstance.mockReturnValue(
      mockCacheInstance as unknown as Cache,
    );
    mockCacheInstance.get.mockResolvedValue(null); // Default to cache miss
    mockCacheInstance.set.mockResolvedValue(undefined);
    mockCacheInstance.invalidate.mockResolvedValue(undefined);

    getAvailableTargetsUseCase = new GetAvailableRemoteDirectoriesUseCase(
      mockGitProviderService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationId = createOrganizationId(uuidv4());
    const userId = createUserId(uuidv4());
    const mockGitRepo: GitRepo = {
      id: createGitRepoId(uuidv4()),
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      providerId: createGitProviderId(uuidv4()),
    };
    const validCommand: GetAvailableRemoteDirectoriesCommand = {
      userId,
      organizationId,
      gitRepo: mockGitRepo,
    };

    describe('when successful execution', () => {
      const mockTargets = ['src/', 'docs/', 'tests/'];
      const expectedCacheKey = `available-remote-directories:${mockGitRepo.id}:root`;

      describe('with cache miss', () => {
        let result: string[];

        beforeEach(async () => {
          mockCacheInstance.get.mockResolvedValue(null); // Cache miss
          mockGitProviderService.listAvailableTargets.mockResolvedValue(
            mockTargets,
          );

          result = await getAvailableTargetsUseCase.execute(validCommand);
        });

        it('returns available targets', () => {
          expect(result).toEqual(mockTargets);
        });

        it('calls cache get with correct key', () => {
          expect(mockCacheInstance.get).toHaveBeenCalledWith(expectedCacheKey);
        });

        it('calls git provider service with correct parameters', () => {
          expect(
            mockGitProviderService.listAvailableTargets,
          ).toHaveBeenCalledWith(mockGitRepo, undefined);
        });

        it('stores result in cache with default expiration', () => {
          expect(mockCacheInstance.set).toHaveBeenCalledWith(
            expectedCacheKey,
            mockTargets,
          );
        });
      });

      describe('with cache hit', () => {
        let result: string[];

        beforeEach(async () => {
          mockCacheInstance.get.mockResolvedValue(mockTargets); // Cache hit
          mockGitProviderService.listAvailableTargets.mockResolvedValue([
            'should',
            'not',
            'be',
            'called',
          ]);

          result = await getAvailableTargetsUseCase.execute(validCommand);
        });

        it('returns cached targets', () => {
          expect(result).toEqual(mockTargets);
        });

        it('calls cache get with correct key', () => {
          expect(mockCacheInstance.get).toHaveBeenCalledWith(expectedCacheKey);
        });

        it('does not call git provider service', () => {
          expect(
            mockGitProviderService.listAvailableTargets,
          ).not.toHaveBeenCalled();
        });

        it('does not store result in cache again', () => {
          expect(mockCacheInstance.set).not.toHaveBeenCalled();
        });
      });

      describe('with path parameter', () => {
        it('calls git provider service with path parameter', async () => {
          const commandWithPath = {
            ...validCommand,
            path: 'src/components',
          };
          mockCacheInstance.get.mockResolvedValue(null); // Cache miss
          mockGitProviderService.listAvailableTargets.mockResolvedValue(
            mockTargets,
          );

          await getAvailableTargetsUseCase.execute(commandWithPath);

          expect(
            mockGitProviderService.listAvailableTargets,
          ).toHaveBeenCalledWith(mockGitRepo, 'src/components');
        });

        it('uses different cache key for different paths', async () => {
          const commandWithPath = {
            ...validCommand,
            path: 'src/components',
          };
          const expectedCacheKeyWithPath = `available-remote-directories:${mockGitRepo.id}:src/components`;
          mockCacheInstance.get.mockResolvedValue(null); // Cache miss
          mockGitProviderService.listAvailableTargets.mockResolvedValue(
            mockTargets,
          );

          await getAvailableTargetsUseCase.execute(commandWithPath);

          expect(mockCacheInstance.get).toHaveBeenCalledWith(
            expectedCacheKeyWithPath,
          );
          expect(mockCacheInstance.set).toHaveBeenCalledWith(
            expectedCacheKeyWithPath,
            mockTargets,
          );
        });
      });
    });

    describe('when validation fails', () => {
      it('throws error for missing organization ID', async () => {
        const invalidCommand = {
          ...validCommand,
          organizationId: '' as never,
        };

        await expect(
          getAvailableTargetsUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization ID is required');
      });
    });

    describe('when git provider service throws error', () => {
      beforeEach(() => {
        mockCacheInstance.get.mockResolvedValue(null); // Ensure cache miss to trigger git provider call
      });

      it('propagates service errors with context', async () => {
        const originalError = new Error('Git provider not found');
        mockGitProviderService.listAvailableTargets.mockRejectedValue(
          originalError,
        );

        await expect(
          getAvailableTargetsUseCase.execute(validCommand),
        ).rejects.toThrow(
          'Failed to get available targets: Git provider not found',
        );
      });

      it('handles non-Error objects', async () => {
        const nonErrorObject = 'String error';
        mockGitProviderService.listAvailableTargets.mockRejectedValue(
          nonErrorObject,
        );

        await expect(
          getAvailableTargetsUseCase.execute(validCommand),
        ).rejects.toThrow('Failed to get available targets: String error');
      });

      describe('when git provider service fails', () => {
        it('does not store in cache', async () => {
          const originalError = new Error('Git provider not found');
          mockGitProviderService.listAvailableTargets.mockRejectedValue(
            originalError,
          );

          try {
            await getAvailableTargetsUseCase.execute(validCommand);
          } catch {
            // Expected to throw
          }

          expect(mockCacheInstance.set).not.toHaveBeenCalled();
        });
      });
    });

    describe('when no targets are available', () => {
      it('returns empty array and caches the result', async () => {
        const expectedCacheKey = `available-remote-directories:${mockGitRepo.id}:root`;
        mockCacheInstance.get.mockResolvedValue(null); // Cache miss
        mockGitProviderService.listAvailableTargets.mockResolvedValue([]);

        const result = await getAvailableTargetsUseCase.execute(validCommand);

        expect(result).toEqual([]);
        expect(mockCacheInstance.set).toHaveBeenCalledWith(
          expectedCacheKey,
          [],
        );
      });
    });
  });
});
