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
    const commitData = {
      sha: 'abc123',
      message: 'Initial commit',
      author: 'test@example.com',
      url: 'https://github.com/owner/repo/commit/abc123',
    };
    let expectedCommit: ReturnType<typeof gitCommitFactory>;
    let result: ReturnType<typeof gitCommitFactory>;

    beforeEach(async () => {
      expectedCommit = gitCommitFactory(commitData);
      mockGitCommitRepository.add.mockResolvedValue(expectedCommit);
      result = await gitCommitService.addCommit(commitData);
    });

    it('calls repository add with commit data', () => {
      expect(mockGitCommitRepository.add).toHaveBeenCalledWith(commitData);
    });

    it('returns the added commit', () => {
      expect(result).toEqual(expectedCommit);
    });
  });

  describe('getCommit', () => {
    describe('when commit exists', () => {
      const commitId = createGitCommitId('test-id');
      let expectedCommit: ReturnType<typeof gitCommitFactory>;
      let result: ReturnType<typeof gitCommitFactory> | null;

      beforeEach(async () => {
        expectedCommit = gitCommitFactory({ id: commitId });
        mockGitCommitRepository.get.mockResolvedValue(expectedCommit);
        result = await gitCommitService.getCommit(commitId);
      });

      it('calls repository get with commit id', () => {
        expect(mockGitCommitRepository.get).toHaveBeenCalledWith(commitId);
      });

      it('returns the commit', () => {
        expect(result).toEqual(expectedCommit);
      });
    });

    describe('when commit does not exist', () => {
      const commitId = createGitCommitId('non-existent-id');
      let result: ReturnType<typeof gitCommitFactory> | null;

      beforeEach(async () => {
        mockGitCommitRepository.get.mockResolvedValue(null);
        result = await gitCommitService.getCommit(commitId);
      });

      it('calls repository get with commit id', () => {
        expect(mockGitCommitRepository.get).toHaveBeenCalledWith(commitId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });
});
