import {
  DeleteItem,
  FileModification,
  GitCommit,
  GitProviderAuthTypes,
  GitRepo,
  gitProviderHasCredentials,
} from '@packmind/types';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { GitProviderService } from '../../GitProviderService';
import { PackmindLogger } from '@packmind/logger';
import { CommitToGit } from '../commitToGit/commitToGit.usecase';

const origin = 'CommitAndOpenPullRequest';

export const PACKMIND_PULL_REQUEST_BRANCH = 'packmind/update-playbook';

export type CommitAndOpenPullRequestInput = {
  repo: GitRepo;
  files: FileModification[];
  commitMessage: string;
  pullRequest: {
    title: string;
    body: string;
  };
  deleteFiles?: DeleteItem[];
};

export type CommitAndOpenPullRequestResult = {
  commit: GitCommit;
  pullRequestUrl: string;
};

export class CommitAndOpenPullRequest {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly commitToGit: CommitToGit,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async execute(
    input: CommitAndOpenPullRequestInput,
  ): Promise<CommitAndOpenPullRequestResult> {
    const { repo, files, commitMessage, pullRequest, deleteFiles } = input;

    this.logger.info('Committing files via pull request', {
      owner: repo.owner,
      repo: repo.repo,
      targetBranch: repo.branch,
      fileCount: files.length,
      deleteFileCount: deleteFiles?.length ?? 0,
    });

    const provider = await this.gitProviderService.findGitProviderById(
      repo.providerId,
    );

    if (!provider) {
      throw new Error('Git provider not found');
    }

    if (provider.authType !== GitProviderAuthTypes.github_app) {
      throw new Error(
        'Pull request workflow is only supported for GitHub App-authenticated providers',
      );
    }

    if (!gitProviderHasCredentials(provider)) {
      throw new Error('Git provider credentials not configured');
    }

    const targetBranchInstance: IGitRepo = this.gitRepoFactory.createGitRepo(
      repo,
      provider,
    );

    const existingPr = await targetBranchInstance.findOpenPullRequest(
      PACKMIND_PULL_REQUEST_BRANCH,
      repo.branch,
    );

    if (existingPr) {
      this.logger.info('Reusing existing pull request branch', {
        owner: repo.owner,
        repo: repo.repo,
        prUrl: existingPr.url,
      });
    } else if (
      await targetBranchInstance.branchExists(PACKMIND_PULL_REQUEST_BRANCH)
    ) {
      this.logger.info(
        'PR branch exists without open PR; resetting to target HEAD',
        {
          owner: repo.owner,
          repo: repo.repo,
          baseBranch: repo.branch,
        },
      );
      await targetBranchInstance.resetBranchToBase(
        PACKMIND_PULL_REQUEST_BRANCH,
        repo.branch,
      );
    } else {
      this.logger.info('Creating PR branch from target', {
        owner: repo.owner,
        repo: repo.repo,
        baseBranch: repo.branch,
      });
      await targetBranchInstance.createBranch(
        PACKMIND_PULL_REQUEST_BRANCH,
        repo.branch,
      );
    }

    const prBranchRepo: GitRepo = {
      ...repo,
      branch: PACKMIND_PULL_REQUEST_BRANCH,
    };

    const commit = await this.commitToGit.commitToGit(
      prBranchRepo,
      files,
      commitMessage,
      deleteFiles,
    );

    const pullRequestRef =
      existingPr ??
      (await targetBranchInstance.createPullRequest({
        fromBranch: PACKMIND_PULL_REQUEST_BRANCH,
        toBranch: repo.branch,
        title: pullRequest.title,
        body: pullRequest.body,
      }));

    this.logger.info('Pull request workflow completed', {
      owner: repo.owner,
      repo: repo.repo,
      prUrl: pullRequestRef.url,
      prNumber: pullRequestRef.number,
      commitSha: commit.sha,
    });

    return {
      commit,
      pullRequestUrl: pullRequestRef.url,
    };
  }
}
