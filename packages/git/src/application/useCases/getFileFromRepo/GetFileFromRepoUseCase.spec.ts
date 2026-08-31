import { GetFileFromRepoUseCase } from './GetFileFromRepoUseCase';
import { GitProviderService } from '../../GitProviderService';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { GitRepo } from '@packmind/types';
import {
  GitProvider,
  GitProviderNotFoundError,
  GitProviderVendors,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

describe('GetFileFromRepoUseCase', () => {
  let useCase: GetFileFromRepoUseCase;
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
    authMethod: 'token',
  } as unknown as GitProvider;

  beforeEach(() => {
    gitProviderService = {
      findGitProviderById: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    mockGitRepoInstance = {
      getFileOnRepo: jest.fn(),
      commitFiles: jest.fn(),
      listDirectoriesOnRepo: jest.fn(),
      checkDirectoryExists: jest.fn(),
    } as jest.Mocked<IGitRepo>;

    gitRepoFactory = {
      createGitRepo: jest.fn().mockImplementation((_gitRepo, provider) => {
        if (provider.authMethod === 'token' && !provider.token) {
          return Promise.reject(new Error('Git provider token not configured'));
        }
        return Promise.resolve(mockGitRepoInstance);
      }),
    } as jest.Mocked<IGitRepoFactory>;

    useCase = new GetFileFromRepoUseCase(
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
      ).rejects.toThrow(GitProviderNotFoundError);
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

  describe('getFilesFromRepo', () => {
    const encode = (content: string) =>
      Buffer.from(content, 'utf-8').toString('base64');

    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue(mockProvider);
      mockGitRepoInstance.getFileOnRepo.mockImplementation(
        async (filePath: string) =>
          filePath === 'missing.md'
            ? null
            : {
                sha: `sha-${filePath}`,
                content: encode(`body of ${filePath}`),
              },
      );
    });

    describe('when several files are requested', () => {
      it('returns the decoded content of each one', async () => {
        const files = await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'a.md',
          'b.md',
        ]);

        expect(files.get('a.md')).toEqual({
          sha: 'sha-a.md',
          content: 'body of a.md',
        });
      });

      // The reason this method exists: one provider row read and one client
      // built, however many files the caller wants.
      it('looks the provider up once', async () => {
        await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'a.md',
          'b.md',
          'c.md',
        ]);

        expect(gitProviderService.findGitProviderById).toHaveBeenCalledTimes(1);
      });

      it('builds a single provider client', async () => {
        await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'a.md',
          'b.md',
          'c.md',
        ]);

        expect(gitRepoFactory.createGitRepo).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the same path is requested twice', () => {
      it('reads it once', async () => {
        await useCase.getFilesFromRepo(mockGitRepoEntity, ['a.md', 'a.md']);

        expect(mockGitRepoInstance.getFileOnRepo).toHaveBeenCalledTimes(1);
      });
    });

    describe('when no paths are requested', () => {
      it('does not touch the provider at all', async () => {
        await useCase.getFilesFromRepo(mockGitRepoEntity, []);

        expect(gitProviderService.findGitProviderById).not.toHaveBeenCalled();
      });
    });

    describe('when a file does not exist', () => {
      it('omits it from the result', async () => {
        const files = await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'a.md',
          'missing.md',
        ]);

        expect(files.has('missing.md')).toBe(false);
      });

      it('still returns the files that do', async () => {
        const files = await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'a.md',
          'missing.md',
        ]);

        expect(files.has('a.md')).toBe(true);
      });
    });

    describe('when one file cannot be read', () => {
      beforeEach(() => {
        mockGitRepoInstance.getFileOnRepo.mockImplementation(
          async (filePath: string) => {
            if (filePath === 'broken.md') {
              throw new Error('boom');
            }
            return { sha: 'sha', content: encode('ok') };
          },
        );
      });

      // A publish that lost every file's existing content because one read
      // failed would overwrite those files instead of merging into them.
      it('does not fail the whole batch', async () => {
        const files = await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'broken.md',
          'fine.md',
        ]);

        expect(files.has('fine.md')).toBe(true);
      });

      it('omits the unreadable file', async () => {
        const files = await useCase.getFilesFromRepo(mockGitRepoEntity, [
          'broken.md',
          'fine.md',
        ]);

        expect(files.has('broken.md')).toBe(false);
      });
    });
  });
});
