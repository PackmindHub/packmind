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

export class HandleWebHook {
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly gitProviderService: GitProviderService,
    private readonly logger: PackmindLogger,
  ) {}

  public async handleWebHook(
    gitRepo: GitRepo,
    payload: unknown,
    fileMatcher: RegExp,
  ): Promise<(GitCommit & { filePath: string; fileContent: string })[]> {
    this.logger.info('Handling webhook for git repository', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
    });

    // Fetch the git provider by ID
    const provider = await this.gitProviderService.findGitProviderById(
      gitRepo.providerId,
    );

    if (!provider) {
      throw new Error('Git provider not found');
    }

    // Validate that provider token is configured
    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    // Create IGitRepo instance based on provider
    const gitRepoInstance = this.createGitRepoInstance(gitRepo, provider);

    // Handle push hook and get matching files
    const matchingFiles = await gitRepoInstance.handlePushHook(
      payload,
      fileMatcher,
    );

    this.logger.info('Found matching files from webhook', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      matchingFilesCount: matchingFiles.length,
    });

    // For each matching file, store the commit in the database and return the result
    const results: (GitCommit & { filePath: string; fileContent: string })[] =
      [];

    for (const file of matchingFiles) {
      // Extract commit information from the file data returned by handlePushHook
      const commitData = {
        sha: file.gitSha || 'unknown-sha',
        message: file.message || 'Webhook commit',
        author: file.author || 'Unknown',
        url: this.buildCommitUrl(
          provider,
          file.gitRepo || '',
          file.gitSha || '',
        ),
      };

      // Store the commit in the database
      const storedCommit = await this.gitCommitService.addCommit(commitData);

      // Add to results with file information
      results.push({
        ...storedCommit,
        filePath: file.filepath,
        fileContent: file.fileContent,
      });
    }

    this.logger.info('Successfully processed webhook', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      storedCommitsCount: results.length,
    });

    return results;
  }

  private buildCommitUrl(
    provider: GitProvider,
    repoUrl: string,
    commitSha: string,
  ): string {
    if (!repoUrl || !commitSha) {
      return repoUrl || '';
    }

    switch (provider.source) {
      case GitProviderVendors.github:
        // Convert repository URL to commit URL
        // e.g., https://github.com/owner/repo -> https://github.com/owner/repo/commit/sha
        return `${repoUrl}/commit/${commitSha}`;
      case GitProviderVendors.gitlab:
        // Convert repository URL to commit URL
        // e.g., https://gitlab.com/owner/repo -> https://gitlab.com/owner/repo/-/commit/sha
        return `${repoUrl}/-/commit/${commitSha}`;
      default:
        // For unsupported providers, return the repository URL as fallback
        return repoUrl;
    }
  }

  private createGitRepoInstance(
    repo: GitRepo,
    provider: GitProvider,
  ): IGitRepo {
    switch (provider.source) {
      case GitProviderVendors.github:
        return new GithubRepository(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          provider.token!,
          {
            owner: repo.owner,
            repo: repo.repo,
            branch: repo.branch,
          },
          this.logger,
        );
      case GitProviderVendors.gitlab:
        return new GitlabRepository(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          provider.token!,
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
