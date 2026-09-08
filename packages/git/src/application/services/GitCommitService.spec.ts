import { GitCommitService } from './GitCommitService';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';

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
});
