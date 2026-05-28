import {
  CommitAndOpenPullRequest,
  PACKMIND_PULL_REQUEST_BRANCH,
} from './commitAndOpenPullRequest.usecase';
import { GitProviderService } from '../../GitProviderService';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { CommitToGit } from '../commitToGit/commitToGit.usecase';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  GitProvider,
  GitProviderAuthTypes,
  GitProviderVendors,
  GitRepo,
} from '@packmind/types';
import { gitCommitFactory } from '../../../../test/gitCommitFactory';

describe('CommitAndOpenPullRequest', () => {
  let useCase: CommitAndOpenPullRequest;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockGitRepoFactory: jest.Mocked<IGitRepoFactory>;
  let mockCommitToGit: jest.Mocked<CommitToGit>;
  let mockGitRepoInstance: jest.Mocked<IGitRepo>;

  const githubAppProvider: GitProvider = {
    id: createGitProviderId('provider-id'),
    source: GitProviderVendors.github,
    organizationId: createOrganizationId('org-id'),
    url: null,
    token: null,
    authType: GitProviderAuthTypes.github_app,
    githubAppInstallationId: 12345,
  };

  const patProvider: GitProvider = {
    id: createGitProviderId('pat-provider-id'),
    source: GitProviderVendors.github,
    organizationId: createOrganizationId('org-id'),
    url: null,
    token: 'pat-token',
    authType: GitProviderAuthTypes.pat,
  };

  const gitRepo: GitRepo = {
    id: createGitRepoId('repo-id'),
    owner: 'owner',
    repo: 'repo',
    branch: 'main',
    providerId: createGitProviderId('provider-id'),
  };

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    mockGitRepoInstance = {
      commitFiles: jest.fn(),
      handlePushHook: jest.fn(),
      getFileOnRepo: jest.fn(),
      listDirectoriesOnRepo: jest.fn(),
      checkDirectoryExists: jest.fn(),
      listFilesInDirectory: jest.fn(),
      branchExists: jest.fn(),
      createBranch: jest.fn(),
      resetBranchToBase: jest.fn(),
      findOpenPullRequest: jest.fn(),
      createPullRequest: jest.fn(),
    } as jest.Mocked<IGitRepo>;

    mockGitRepoFactory = {
      createGitRepo: jest.fn().mockReturnValue(mockGitRepoInstance),
    } as jest.Mocked<IGitRepoFactory>;

    mockCommitToGit = {
      commitToGit: jest.fn(),
    } as unknown as jest.Mocked<CommitToGit>;

    useCase = new CommitAndOpenPullRequest(
      mockGitProviderService,
      mockGitRepoFactory,
      mockCommitToGit,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when provider is not GitHub App-authenticated', () => {
    it('throws an error', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(patProvider);

      await expect(
        useCase.execute({
          repo: gitRepo,
          files: [{ path: 'a.md', content: 'a' }],
          commitMessage: 'msg',
          pullRequest: { title: 't', body: 'b' },
        }),
      ).rejects.toThrow(
        'Pull request workflow is only supported for GitHub App-authenticated providers',
      );
    });
  });

  describe('when the provider does not exist', () => {
    it('throws an error', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          repo: gitRepo,
          files: [{ path: 'a.md', content: 'a' }],
          commitMessage: 'msg',
          pullRequest: { title: 't', body: 'b' },
        }),
      ).rejects.toThrow('Git provider not found');
    });
  });

  describe('when an open PR already exists on the Packmind branch', () => {
    it('reuses the branch and PR without resetting', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        githubAppProvider,
      );
      mockGitRepoInstance.findOpenPullRequest.mockResolvedValue({
        url: 'https://github.com/owner/repo/pull/42',
        number: 42,
      });
      const commit = gitCommitFactory({ sha: 'commit-sha' });
      mockCommitToGit.commitToGit.mockResolvedValue(commit);

      const result = await useCase.execute({
        repo: gitRepo,
        files: [{ path: 'a.md', content: 'a' }],
        commitMessage: 'msg',
        pullRequest: { title: 't', body: 'b' },
      });

      expect(mockGitRepoInstance.branchExists).not.toHaveBeenCalled();
      expect(mockGitRepoInstance.resetBranchToBase).not.toHaveBeenCalled();
      expect(mockGitRepoInstance.createBranch).not.toHaveBeenCalled();
      expect(mockGitRepoInstance.createPullRequest).not.toHaveBeenCalled();

      const commitCallArgs = mockCommitToGit.commitToGit.mock.calls[0];
      expect(commitCallArgs[0].branch).toBe(PACKMIND_PULL_REQUEST_BRANCH);

      expect(result).toEqual({
        commit,
        pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      });
    });
  });

  describe('when the PR branch exists but has no open PR', () => {
    it('resets the branch to base, commits, and opens a new PR', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        githubAppProvider,
      );
      mockGitRepoInstance.findOpenPullRequest.mockResolvedValue(null);
      mockGitRepoInstance.branchExists.mockResolvedValue(true);
      const commit = gitCommitFactory({ sha: 'commit-sha' });
      mockCommitToGit.commitToGit.mockResolvedValue(commit);
      mockGitRepoInstance.createPullRequest.mockResolvedValue({
        url: 'https://github.com/owner/repo/pull/99',
        number: 99,
      });

      const result = await useCase.execute({
        repo: gitRepo,
        files: [{ path: 'a.md', content: 'a' }],
        commitMessage: 'msg',
        pullRequest: { title: 'Packmind: update playbook', body: 'body' },
      });

      expect(mockGitRepoInstance.resetBranchToBase).toHaveBeenCalledWith(
        PACKMIND_PULL_REQUEST_BRANCH,
        'main',
      );
      expect(mockGitRepoInstance.createBranch).not.toHaveBeenCalled();
      expect(mockGitRepoInstance.createPullRequest).toHaveBeenCalledWith({
        fromBranch: PACKMIND_PULL_REQUEST_BRANCH,
        toBranch: 'main',
        title: 'Packmind: update playbook',
        body: 'body',
      });
      expect(result.pullRequestUrl).toBe(
        'https://github.com/owner/repo/pull/99',
      );
    });
  });

  describe('when the PR branch does not exist', () => {
    it('creates the branch from the target, commits, and opens a PR', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        githubAppProvider,
      );
      mockGitRepoInstance.findOpenPullRequest.mockResolvedValue(null);
      mockGitRepoInstance.branchExists.mockResolvedValue(false);
      const commit = gitCommitFactory({ sha: 'sha-new' });
      mockCommitToGit.commitToGit.mockResolvedValue(commit);
      mockGitRepoInstance.createPullRequest.mockResolvedValue({
        url: 'https://github.com/owner/repo/pull/1',
        number: 1,
      });

      const result = await useCase.execute({
        repo: gitRepo,
        files: [{ path: 'a.md', content: 'a' }],
        commitMessage: 'msg',
        pullRequest: { title: 'Packmind: update playbook', body: 'body' },
      });

      expect(mockGitRepoInstance.createBranch).toHaveBeenCalledWith(
        PACKMIND_PULL_REQUEST_BRANCH,
        'main',
      );
      expect(mockGitRepoInstance.resetBranchToBase).not.toHaveBeenCalled();
      expect(mockGitRepoInstance.createPullRequest).toHaveBeenCalled();
      expect(result.pullRequestUrl).toBe(
        'https://github.com/owner/repo/pull/1',
      );
      expect(result.commit).toBe(commit);
    });
  });

  describe('when commitToGit throws NO_CHANGES_DETECTED', () => {
    it('propagates the error', async () => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        githubAppProvider,
      );
      mockGitRepoInstance.findOpenPullRequest.mockResolvedValue({
        url: 'https://github.com/owner/repo/pull/5',
        number: 5,
      });
      mockCommitToGit.commitToGit.mockRejectedValue(
        new Error('NO_CHANGES_DETECTED'),
      );

      await expect(
        useCase.execute({
          repo: gitRepo,
          files: [{ path: 'a.md', content: 'a' }],
          commitMessage: 'msg',
          pullRequest: { title: 't', body: 'b' },
        }),
      ).rejects.toThrow('NO_CHANGES_DETECTED');
    });
  });
});
