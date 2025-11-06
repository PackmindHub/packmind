import { GitRepo } from '../../../domain/entities/GitRepo';
import {
  GitProviderVendors,
  GitProvider,
} from '../../../domain/entities/GitProvider';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { GitCommitService } from '../../services/GitCommitService';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { PackmindLogger } from '@packmind/logger';
import {
  HandleWebHookCommand,
  HandleWebHookResult,
  IHandleWebHookUseCase,
} from '@packmind/shared';

export class HandleWebHook implements IHandleWebHookUseCase {
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger,
  ) {}

  public async execute(
    command: HandleWebHookCommand,
  ): Promise<HandleWebHookResult> {
    const { gitRepoId, payload, fileMatcher } = command;

    // Fetch the git repository by ID
    const gitRepo = await this.gitRepoService.findGitRepoById(gitRepoId);

    if (!gitRepo) {
      throw new Error('Git repository not found');
    }

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
    const results: HandleWebHookResult = [];

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
        gitCommit: storedCommit,
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
    return this.gitRepoFactory.createGitRepo(repo, provider);
  }
}
