import { GetFileFromRepo } from './getFileFromRepo.usecase';
import { GitProviderService } from '../../GitProviderService';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { GitRepo } from '@packmind/types';
import { GitProvider, GitProviderVendors } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

describe('GetFileFromRepo', () => {
  let useCase: GetFileFromRepo;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let gitRepoFactory: jest.Mocked<IGitRepoFactory>;
  let mockGitRepoInstance: jest.Mocked<IGitRepo>;

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

    useCase = new GetFileFromRepo(
      gitProviderService,
      gitRepoFactory,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when file exists and contains valid base64 content', () => {
    const originalContent = 'Hello, World! This is a test file.';
    const base64Content = Buffer.from(originalContent).toString('base64');
    const fileSha = 'test-sha-123';
    let result: { sha: string; content: string } | null;

    beforeEach(async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue({
        sha: fileSha,
        content: base64Content,
      });

      result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'test-file.txt',
      );
    });

    it('returns the correct sha', () => {
      expect(result?.sha).toEqual(fileSha);
    });

    it('returns decoded UTF-8 content', () => {
      expect(result?.content).toEqual(originalContent);
    });
  });

  describe('when file content decoding succeeds with garbled base64', () => {
    const garbageBase64Content = 'invalid-base64-content!';
    const fileSha = 'test-sha-123';
    let result: { sha: string; content: string } | null;

    beforeEach(async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue({
        sha: fileSha,
        content: garbageBase64Content,
      });

      result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'test-file.txt',
      );
    });

    it('returns the correct sha', () => {
      expect(result?.sha).toEqual(fileSha);
    });

    it('returns decoded content', () => {
      expect(result?.content).toEqual(
        Buffer.from(garbageBase64Content, 'base64').toString('utf-8'),
      );
    });
  });

  describe('when file does not exist', () => {
    it('returns null', async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue(null);

      const result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'non-existent-file.txt',
      );

      expect(result).toBeNull();
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
    const originalContent = 'Branch content';
    const base64Content = Buffer.from(originalContent).toString('base64');
    const customBranch = 'feature-branch';
    let result: { sha: string; content: string } | null;

    beforeEach(async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);
      mockGitRepoInstance.getFileOnRepo.mockResolvedValue({
        sha: 'branch-sha',
        content: base64Content,
      });

      result = await useCase.getFileFromRepo(
        mockGitRepoEntity,
        'test-file.txt',
        customBranch,
      );
    });

    it('returns decoded content', () => {
      expect(result).toEqual({
        sha: 'branch-sha',
        content: originalContent,
      });
    });

    it('passes branch parameter to getFileOnRepo', () => {
      expect(mockGitRepoInstance.getFileOnRepo).toHaveBeenCalledWith(
        'test-file.txt',
        customBranch,
      );
    });
  });
});
