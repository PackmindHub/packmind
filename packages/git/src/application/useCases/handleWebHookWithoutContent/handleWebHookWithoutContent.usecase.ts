import { GitRepo } from '../../../domain/entities/GitRepo';
import {
  GitProviderVendors,
  GitProvider,
} from '../../../domain/entities/GitProvider';
import { GitCommitService } from '../../services/GitCommitService';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { PackmindLogger } from '@packmind/logger';
import {
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult,
  IHandleWebHookWithoutContentUseCase,
} from '@packmind/types';
import {
  GithubWebhookPushPayload,
  GitlabWebhookPushPayload,
} from '../../../domain/types/webhookPayloads';

export class HandleWebHookWithoutContent
  implements IHandleWebHookWithoutContentUseCase
{
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    private readonly logger: PackmindLogger,
  ) {}

  public async execute(
    command: HandleWebHookWithoutContentCommand,
  ): Promise<HandleWebHookWithoutContentResult> {
    const { gitRepoId, payload, fileMatcher } = command;

    // Fetch the git repository by ID
    const gitRepo = await this.gitRepoService.findGitRepoById(gitRepoId);

    if (!gitRepo) {
      throw new Error('Git repository not found');
    }

    this.logger.info('Handling webhook for git repository without content', {
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

    // Build git repository URL
    const gitRepoUrl = this.buildRepoUrl(provider, gitRepo);

    // Extract matching files from webhook payload based on provider type
    const matchingFiles = this.extractMatchingFilesFromPayload(
      payload,
      fileMatcher,
      provider,
      gitRepoUrl,
    );

    this.logger.info('Found matching files from webhook', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      matchingFilesCount: matchingFiles.length,
    });

    // For each matching file, store the commit in the database and return the result
    const results: HandleWebHookWithoutContentResult = [];

    for (const file of matchingFiles) {
      // Extract commit information from the file data
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

      // Add to results with file information (without content)
      results.push({
        gitCommit: storedCommit,
        filePath: file.filepath,
      });
    }

    this.logger.info('Successfully processed webhook without content', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      storedCommitsCount: results.length,
    });

    return results;
  }

  private buildRepoUrl(provider: GitProvider, gitRepo: GitRepo): string {
    switch (provider.source) {
      case GitProviderVendors.github:
        return `https://github.com/${gitRepo.owner}/${gitRepo.repo}`;
      case GitProviderVendors.gitlab:
        // For GitLab, we would need to extract this from the provider's URL
        // Using a default pattern here
        return `https://gitlab.com/${gitRepo.owner}/${gitRepo.repo}`;
      default:
        return '';
    }
  }

  private extractMatchingFilesFromPayload(
    payload: unknown,
    fileMatcher: RegExp,
    provider: GitProvider,
    gitRepoUrl: string,
  ): Array<{
    filepath: string;
    author: string | null;
    gitSha: string | null;
    gitRepo: string | null;
    message: string | null;
  }> {
    switch (provider.source) {
      case GitProviderVendors.github:
        return this.extractFromGithubPayload(
          payload as GithubWebhookPushPayload,
          fileMatcher,
          gitRepoUrl,
        );
      case GitProviderVendors.gitlab:
        return this.extractFromGitlabPayload(
          payload as GitlabWebhookPushPayload,
          fileMatcher,
          gitRepoUrl,
        );
      default:
        this.logger.warn('Unsupported git provider', {
          source: provider.source,
        });
        return [];
    }
  }

  private extractFromGithubPayload(
    pushPayload: GithubWebhookPushPayload,
    fileMatcher: RegExp,
    gitRepoUrl: string,
  ): Array<{
    filepath: string;
    author: string | null;
    gitSha: string | null;
    gitRepo: string | null;
    message: string | null;
  }> {
    if (!pushPayload.commits || !Array.isArray(pushPayload.commits)) {
      return [];
    }

    const fileToLatestCommit: Map<
      string,
      { commitId: string; author: string | null; message: string | null }
    > = new Map();

    // Process all commits to find modified files that match the pattern
    for (const commit of pushPayload.commits) {
      if (!commit.modified || !Array.isArray(commit.modified)) continue;

      // Filter modified files that match the pattern
      const commitMatchingFiles = commit.modified.filter((filepath) =>
        fileMatcher.test(filepath),
      );

      // Extract commit author and message
      const author = commit.author?.name || null;
      const message = commit.message || null;

      // Update the latest commit for each matching file
      commitMatchingFiles.forEach((filepath) => {
        fileToLatestCommit.set(filepath, {
          commitId: commit.id || '',
          author,
          message,
        });
      });
    }

    // Convert map to array of results
    return Array.from(fileToLatestCommit.entries()).map(
      ([filepath, { commitId, author, message }]) => ({
        filepath,
        author,
        gitSha: commitId,
        gitRepo: gitRepoUrl,
        message,
      }),
    );
  }

  private extractFromGitlabPayload(
    pushPayload: GitlabWebhookPushPayload,
    fileMatcher: RegExp,
    gitRepoUrl: string,
  ): Array<{
    filepath: string;
    author: string | null;
    gitSha: string | null;
    gitRepo: string | null;
    message: string | null;
  }> {
    if (!pushPayload.commits || !Array.isArray(pushPayload.commits)) {
      return [];
    }

    const fileToLatestCommit: Map<
      string,
      { commitId: string; author: string | null; message: string | null }
    > = new Map();

    // Process all commits to find modified files that match the pattern
    for (const commit of pushPayload.commits) {
      if (!commit.modified || !Array.isArray(commit.modified)) continue;

      // Filter modified files that match the pattern
      const commitMatchingFiles = commit.modified.filter((filepath) =>
        fileMatcher.test(filepath),
      );

      // Extract commit author and message
      const author = commit.author?.name || null;
      const message = commit.message || null;

      // Update the latest commit for each matching file
      commitMatchingFiles.forEach((filepath) => {
        fileToLatestCommit.set(filepath, {
          commitId: commit.id || '',
          author,
          message,
        });
      });
    }

    // Convert map to array of results
    return Array.from(fileToLatestCommit.entries()).map(
      ([filepath, { commitId, author, message }]) => ({
        filepath,
        author,
        gitSha: commitId,
        gitRepo: gitRepoUrl,
        message,
      }),
    );
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
        return `${repoUrl}/commit/${commitSha}`;
      case GitProviderVendors.gitlab:
        return `${repoUrl}/-/commit/${commitSha}`;
      default:
        return repoUrl;
    }
  }
}
