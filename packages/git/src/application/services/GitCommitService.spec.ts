import { GitCommitService } from './GitCommitService';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';
import { createGitCommitId } from '@packmind/types';
import { gitCommitFactory } from '../../../test/gitCommitFactory';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

describe('GitCommitService', () => {
  let gitCommitService: GitCommitService;
  let mockGitCommitRepository: jest.Mocked<IGitCommitRepository>;
  let mockLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockGitCommitRepository = {
      add: jest.fn(),
      get: jest.fn(),
    } as jest.Mocked<IGitCommitRepository>;

    mockLogger = stubLogger();

    gitCommitService = new GitCommitService(
      mockGitCommitRepository,
      mockLogger,
    );
  });

  describe('addCommit', () => {
    it('adds a git commit and returns it', async () => {
      const commitData = {
        sha: 'abc123',
        message: 'Initial commit',
        author: 'test@example.com',
        url: 'https://github.com/owner/repo/commit/abc123',
      };

      const expectedCommit = gitCommitFactory(commitData);
      mockGitCommitRepository.add.mockResolvedValue(expectedCommit);

      const result = await gitCommitService.addCommit(commitData);

      expect(mockGitCommitRepository.add).toHaveBeenCalledWith(commitData);
      expect(result).toEqual(expectedCommit);
    });
  });

  describe('getCommit', () => {
    it('gets a git commit by id', async () => {
      const commitId = createGitCommitId('test-id');
      const expectedCommit = gitCommitFactory({ id: commitId });
      mockGitCommitRepository.get.mockResolvedValue(expectedCommit);

      const result = await gitCommitService.getCommit(commitId);

      expect(mockGitCommitRepository.get).toHaveBeenCalledWith(commitId);
      expect(result).toEqual(expectedCommit);
    });

    it('returns null if commit is not found', async () => {
      const commitId = createGitCommitId('non-existent-id');
      mockGitCommitRepository.get.mockResolvedValue(null);

      const result = await gitCommitService.getCommit(commitId);

      expect(mockGitCommitRepository.get).toHaveBeenCalledWith(commitId);
      expect(result).toBeNull();
    });
  });
});
