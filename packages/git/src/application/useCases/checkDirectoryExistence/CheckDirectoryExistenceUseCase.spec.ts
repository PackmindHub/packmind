import { CheckDirectoryExistenceUseCase } from './CheckDirectoryExistenceUseCase';
import {
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  GitProviderNotFoundError,
  GitRepoNotFoundError,
  MissingGitInputError,
  createGitRepoId,
  createGitProviderId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { IGitProviderRepository } from '../../../domain/repositories/IGitProviderRepository';
import { ResolvedGitRepoService } from '../../services/ResolvedGitRepoService';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { stubLogger, mockInterface } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { gitRepoFactory, gitProviderFactory } from '../../../../test';
import { DirectoryExistenceCheckFailedError } from '../../../domain/errors/DirectoryExistenceCheckFailedError';
import { GitlabApiOperationFailedError } from '../../../domain/errors/GitlabApiOperationFailedError';

describe('CheckDirectoryExistenceUseCase', () => {
  let useCase: CheckDirectoryExistenceUseCase;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockGitProviderRepository: jest.Mocked<IGitProviderRepository>;
  let mockGitRepoFactory: jest.Mocked<IGitRepoFactory>;
  let mockGitRepoInstance: jest.Mocked<IGitRepo>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockGitRepoService = mockInterface<GitRepoService>();

    mockGitProviderRepository = mockInterface<IGitProviderRepository>();

    mockGitRepoInstance = mockInterface<IGitRepo>();

    mockGitRepoFactory = {
      createGitRepo: jest.fn().mockImplementation((_gitRepo, provider) => {
        if (provider.authMethod === 'token' && !provider.token) {
          return Promise.reject(new Error('Git provider token not configured'));
        }
        return Promise.resolve(mockGitRepoInstance);
      }),
    } as jest.Mocked<IGitRepoFactory>;

    stubbedLogger = stubLogger();

    useCase = new CheckDirectoryExistenceUseCase(
      mockGitRepoService,
      new ResolvedGitRepoService(
        mockGitProviderRepository,
        mockGitRepoFactory,
        stubbedLogger,
      ),
      stubbedLogger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    const gitRepoId = createGitRepoId('test-repo-id');
    const gitProviderId = createGitProviderId('test-provider-id');
    const organizationId = createOrganizationId('test-org-id');
    const userId = createUserId('test-user-id');

    const validCommand: CheckDirectoryExistenceCommand = {
      gitRepoId,
      directoryPath: 'src/components',
      branch: 'main',
      userId,
      organizationId,
    };

    const mockGitRepo = gitRepoFactory({
      id: gitRepoId,
      providerId: gitProviderId,
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
    });

    const mockGitProvider = gitProviderFactory({
      id: gitProviderId,
      token: 'test-token',
      organizationId,
    });

    describe('when successful execution', () => {
      let result: CheckDirectoryExistenceResult;

      beforeEach(async () => {
        mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGitRepoInstance.checkDirectoryExists.mockResolvedValue(true);

        result = await useCase.execute(validCommand);
      });

      it('returns expected result with directory exists true', () => {
        expect(result).toEqual({
          exists: true,
          path: 'src/components',
          branch: 'main',
        });
      });

      it('calls git repo service with correct repository ID', () => {
        expect(mockGitRepoService.findGitRepoById).toHaveBeenCalledWith(
          gitRepoId,
        );
      });

      it('calls git provider service with correct provider ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          gitProviderId,
        );
      });

      it('calls git repo factory with correct parameters', () => {
        expect(mockGitRepoFactory.createGitRepo).toHaveBeenCalledWith(
          mockGitRepo,
          mockGitProvider,
        );
      });

      it('calls repository checkDirectoryExists with correct parameters', () => {
        expect(mockGitRepoInstance.checkDirectoryExists).toHaveBeenCalledWith(
          'src/components',
          'main',
        );
      });
    });

    describe('when directory does not exist', () => {
      let result: CheckDirectoryExistenceResult;

      beforeEach(async () => {
        mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGitRepoInstance.checkDirectoryExists.mockResolvedValue(false);

        result = await useCase.execute(validCommand);
      });

      it('returns expected result with directory exists false', () => {
        expect(result).toEqual({
          exists: false,
          path: 'src/components',
          branch: 'main',
        });
      });
    });

    describe('when validation fails', () => {
      it('throws error for missing git repository ID', async () => {
        const invalidCommand = {
          ...validCommand,
          gitRepoId: '',
        } as CheckDirectoryExistenceCommand;

        await expect(useCase.execute(invalidCommand)).rejects.toBeInstanceOf(
          MissingGitInputError,
        );
      });

      it('throws error for missing directory path', async () => {
        const invalidCommand = {
          ...validCommand,
          directoryPath: '',
        };

        await expect(useCase.execute(invalidCommand)).rejects.toBeInstanceOf(
          MissingGitInputError,
        );
      });

      it('throws error for missing branch', async () => {
        const invalidCommand = {
          ...validCommand,
          branch: '',
        };

        await expect(useCase.execute(invalidCommand)).rejects.toBeInstanceOf(
          MissingGitInputError,
        );
      });
    });

    describe('when git repository not found', () => {
      it('throws error for non-existent repository', async () => {
        mockGitRepoService.findGitRepoById.mockResolvedValue(null);

        await expect(useCase.execute(validCommand)).rejects.toBeInstanceOf(
          GitRepoNotFoundError,
        );
      });
    });

    describe('when git provider not found', () => {
      it('throws error for non-existent provider', async () => {
        mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
        mockGitProviderRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(validCommand)).rejects.toThrow(
          GitProviderNotFoundError,
        );
      });
    });

    describe('when git provider token not configured', () => {
      it('throws error for provider without token', async () => {
        const providerWithoutToken = gitProviderFactory({
          id: gitProviderId,
          token: undefined,
          organizationId,
        });

        mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
        mockGitProviderRepository.findById.mockResolvedValue(
          providerWithoutToken,
        );

        await expect(useCase.execute(validCommand)).rejects.toThrow(
          'Git provider token not configured',
        );
      });
    });

    describe('when git repo service throws error', () => {
      it('propagates git repo service errors', async () => {
        const error = new Error('Database connection failed');
        mockGitRepoService.findGitRepoById.mockRejectedValue(error);

        await expect(useCase.execute(validCommand)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when git provider service throws error', () => {
      it('propagates git provider service errors', async () => {
        const error = new Error('Provider service error');
        mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
        mockGitProviderRepository.findById.mockRejectedValue(error);

        await expect(useCase.execute(validCommand)).rejects.toThrow(
          'Provider service error',
        );
      });
    });

    describe('when git repository instance throws error', () => {
      it('wraps repository instance errors', async () => {
        const repositoryError = new Error('Git API rate limit exceeded');
        mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGitRepoInstance.checkDirectoryExists.mockRejectedValue(
          repositoryError,
        );

        await expect(useCase.execute(validCommand)).rejects.toBeInstanceOf(
          DirectoryExistenceCheckFailedError,
        );
      });

      describe('when the failure already says whose fault it is', () => {
        it('lets a domain failure through untouched', async () => {
          const notFound = new GitRepoNotFoundError(gitRepoId);
          mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
          mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
          mockGitRepoInstance.checkDirectoryExists.mockRejectedValue(notFound);

          await expect(useCase.execute(validCommand)).rejects.toBe(notFound);
        });

        it('lets an upstream failure through untouched', async () => {
          const upstream = new GitlabApiOperationFailedError(
            'list directories from GitLab',
            new Error('gateway timeout'),
          );
          mockGitRepoService.findGitRepoById.mockResolvedValue(mockGitRepo);
          mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
          mockGitRepoInstance.checkDirectoryExists.mockRejectedValue(upstream);

          await expect(useCase.execute(validCommand)).rejects.toBe(upstream);
        });
      });
    });
  });
});
