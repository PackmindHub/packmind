import { GetFileFromRepo } from './getFileFromRepo.usecase';
import { GitProviderService } from '../../GitProviderService';
import { GitRepo } from '../../../domain/entities/GitRepo';
import {
  GitProvider,
  GitProviderVendors,
} from '../../../domain/entities/GitProvider';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { GithubRepository } from '../../../infra/repositories/github/GithubRepository';

describe('GetFileFromRepo', () => {
  let useCase: GetFileFromRepo;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let logger: PackmindLogger;

  const mockGitRepo: GitRepo = {
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

    logger = stubLogger();

    useCase = new GetFileFromRepo(gitProviderService, logger);
  });

  describe('when file exists and contains valid base64 content', () => {
    it('returns decoded UTF-8 content', async () => {
      const originalContent = 'Hello, World! This is a test file.';
      const base64Content = Buffer.from(originalContent).toString('base64');
      const fileSha = 'test-sha-123';

      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);

      // Mock the GithubRepository.getFileOnRepo method
      const mockGetFileOnRepo = jest.fn().mockResolvedValue({
        sha: fileSha,
        content: base64Content,
      });

      jest
        .spyOn(GithubRepository.prototype, 'getFileOnRepo')
        .mockImplementation(mockGetFileOnRepo);

      const result = await useCase.getFileFromRepo(
        mockGitRepo,
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

      const mockGetFileOnRepo = jest.fn().mockResolvedValue({
        sha: fileSha,
        content: garbageBase64Content,
      });

      jest
        .spyOn(GithubRepository.prototype, 'getFileOnRepo')
        .mockImplementation(mockGetFileOnRepo);

      const result = await useCase.getFileFromRepo(
        mockGitRepo,
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

      const mockGetFileOnRepo = jest.fn().mockResolvedValue(null);
      jest
        .spyOn(GithubRepository.prototype, 'getFileOnRepo')
        .mockImplementation(mockGetFileOnRepo);

      const result = await useCase.getFileFromRepo(
        mockGitRepo,
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
        useCase.getFileFromRepo(mockGitRepo, 'test-file.txt'),
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
        useCase.getFileFromRepo(mockGitRepo, 'test-file.txt'),
      ).rejects.toThrow('Git provider token not configured');
    });
  });

  describe('when using custom branch', () => {
    it('passes branch parameter correctly', async () => {
      const originalContent = 'Branch content';
      const base64Content = Buffer.from(originalContent).toString('base64');
      const customBranch = 'feature-branch';

      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);

      const mockGetFileOnRepo = jest.fn().mockResolvedValue({
        sha: 'branch-sha',
        content: base64Content,
      });

      jest
        .spyOn(GithubRepository.prototype, 'getFileOnRepo')
        .mockImplementation(mockGetFileOnRepo);

      const result = await useCase.getFileFromRepo(
        mockGitRepo,
        'test-file.txt',
        customBranch,
      );

      expect(result).toEqual({
        sha: 'branch-sha',
        content: originalContent,
      });

      expect(mockGetFileOnRepo).toHaveBeenCalledWith(
        'test-file.txt',
        customBranch,
      );
    });
  });
});
