import { GitRepo } from '../../../domain/entities/GitRepo';
import { GitCommit } from '../../../domain/entities/GitCommit';
import {
  GitProviderVendors,
  GitProvider,
} from '../../../domain/entities/GitProvider';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { GitCommitService } from '../../services/GitCommitService';
import { GitProviderService } from '../../GitProviderService';
import { GithubRepository } from '../../../infra/repositories/github/GithubRepository';
import { GitlabRepository } from '../../../infra/repositories/gitlab/GitlabRepository';
import { PackmindLogger } from '@packmind/shared';

export class CommitToGit {
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly gitProviderService: GitProviderService,
    private readonly logger: PackmindLogger,
  ) {}

  public async commitToGit(
    repo: GitRepo,
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<GitCommit> {
    this.logger.info('Committing multiple files to git repository', {
      owner: repo.owner,
      repo: repo.repo,
      fileCount: files.length,
    });

    // Validate files array is not empty
    if (!files.length) {
      throw new Error('No files to commit');
    }

    // Fetch the git provider by ID
    const provider = await this.gitProviderService.findGitProviderById(
      repo.providerId,
    );

    if (!provider) {
      throw new Error('Git provider not found');
    }

    // Validate that provider token is configured
    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    // Create IGitRepo instance based on provider
    const gitRepoInstance = this.createGitRepoInstance(repo, provider);

    // Commit files to git repository and get commit data
    const commitData = await gitRepoInstance.commitFiles(files, commitMessage);

    // Check if no changes were detected (GitLab returns 'no-changes' as sha)
    if (commitData.sha === 'no-changes') {
      this.logger.info('No changes detected, skipping commit creation', {
        owner: repo.owner,
        repo: repo.repo,
        fileCount: files.length,
      });
      // Throw a specific error that can be caught by deployment logic
      throw new Error('NO_CHANGES_DETECTED');
    }

    // Store the commit in the database
    return this.gitCommitService.addCommit(commitData);
  }

  private createGitRepoInstance(
    repo: GitRepo,
    provider: GitProvider,
  ): IGitRepo {
    switch (provider.source) {
      case GitProviderVendors.github:
        // We've already validated that provider.token exists
        if (!provider.token) {
          throw new Error('Git provider token not configured');
        }
        return new GithubRepository(
          provider.token,
          {
            owner: repo.owner,
            repo: repo.repo,
            branch: repo.branch,
          },
          this.logger,
        );
      case GitProviderVendors.gitlab:
        // We've already validated that provider.token exists
        if (!provider.token) {
          throw new Error('Git provider token not configured');
        }
        return new GitlabRepository(
          provider.token,
          {
            owner: repo.owner,
            repo: repo.repo,
            branch: repo.branch,
          },
          this.logger,
          provider.url || undefined,
        );
      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }
}
