import { GetFileFromRepo } from './getFileFromRepo.usecase';
import { GitProviderService } from '../../GitProviderService';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { GitRepo } from '@packmind/types';
import { GitProvider, GitProviderVendors } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

describe('GetFileFromRepo', () => {
  let useCase: GetFileFromRepo;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let gitRepoFactory: jest.Mocked<IGitRepoFactory>;
  let mockGitRepoInstance: jest.Mocked<IGitRepo>;
  let logger: PackmindLogger;

  const mockGitRepoEntity: GitRepo = {
    id: 'repo-123',
    owner: 'test-owner',
    repo: 'test-repo',
    branch: 'main',
    providerId: 'provider-123',
  } as unknown as GitRepo;

  const mockProvider: GitProvider = {
    id: 'provider-123',
    source: GitProviderVendors.github,
    token: 'test-token',
  } as unknown as GitProvider;

  beforeEach(() => {
    gitProviderService = {
      findGitProviderById: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    mockGitRepoInstance = {
      getFileOnRepo: jest.fn(),
      commitFiles: jest.fn(),
      handlePushHook: jest.fn(),
      listDirectoriesOnRepo: jest.fn(),
      checkDirectoryExists: jest.fn(),
    } as jest.Mocked<IGitRepo>;

    gitRepoFactory = {
      createGitRepo: jest.fn().mockReturnValue(mockGitRepoInstance),
    } as jest.Mocked<IGitRepoFactory>;

    logger = stubLogger();

    useCase = new GetFileFromRepo(gitProviderService, gitRepoFactory, logger);
  });

  describe('when file exists and contains valid base64 content', () => {
    it('returns decoded UTF-8 content', async () => {
      const originalContent = 'Hello, World! This is a test file.';
      const base64Content = Buffer.from(originalContent).toString('base64');
      const fileSha = 'test-sha-123';

      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);

      // Mock the git repo instance
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue({
        sha: fileSha,
        content: base64Content,
      });

      const result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'test-file.txt',
      );

      expect(result).toEqual({
        sha: fileSha,
        content: originalContent, // Should be decoded UTF-8, not base64
      });

      expect(logger.info).toHaveBeenCalledWith(
        'File retrieved and decoded successfully',
        expect.objectContaining({
          filePath: 'test-file.txt',
          sha: fileSha,
          decodedContentLength: originalContent.length,
        }),
      );
    });
  });

  describe('when file content decoding succeeds with garbled base64', () => {
    it('returns decoded content (even if garbled)', async () => {
      // Node.js Buffer.from() doesn't throw for "invalid" base64, it just decodes what it can
      const garbageBase64Content = 'invalid-base64-content!';
      const fileSha = 'test-sha-123';

      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);

      // Mock the git repo instance
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue({
        sha: fileSha,
        content: garbageBase64Content,
      });

      const result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'test-file.txt',
      );

      expect(result).toEqual({
        sha: fileSha,
        content: Buffer.from(garbageBase64Content, 'base64').toString('utf-8'),
      });

      expect(logger.info).toHaveBeenCalledWith(
        'File retrieved and decoded successfully',
        expect.objectContaining({
          filePath: 'test-file.txt',
          sha: fileSha,
        }),
      );
    });
  });

  describe('when file does not exist', () => {
    it('returns null', async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);

      // Mock the git repo instance to return null (file not found)
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue(null);

      const result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'non-existent-file.txt',
      );

      expect(result).toBeNull();

      expect(logger.info).toHaveBeenCalledWith(
        'File not found in repository',
        expect.objectContaining({
          filePath: 'non-existent-file.txt',
        }),
      );
    });
  });

  describe('when git provider is not found', () => {
    it('throws error', async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(
        useCase.getFileFromRepo(mockGitRepoEntity, 'test-file.txt'),
      ).rejects.toThrow('Git provider not found');
    });
  });

  describe('when git provider token is not configured', () => {
    it('throws error', async () => {
      const providerWithoutToken = { ...mockProvider, token: undefined };
      gitProviderService.findGitProviderById.mockResolvedValue(
        providerWithoutToken as unknown as GitProvider,
      );

      await expect(
        useCase.getFileFromRepo(mockGitRepoEntity, 'test-file.txt'),
      ).rejects.toThrow('Git provider token not configured');
    });
  });

  describe('when using custom branch', () => {
    it('passes branch parameter correctly', async () => {
      const originalContent = 'Branch content';
      const base64Content = Buffer.from(originalContent).toString('base64');
      const customBranch = 'feature-branch';

      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);

      // Mock the git repo instance
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue({
        sha: 'branch-sha',
        content: base64Content,
      });

      const result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'test-file.txt',
        customBranch,
      );

      expect(result).toEqual({
        sha: 'branch-sha',
        content: originalContent,
      });

      expect(mockGitRepoInstance.getFileOnRepo).toHaveBeenCalledWith(
        'test-file.txt',
        customBranch,
      );
    });
  });
});
