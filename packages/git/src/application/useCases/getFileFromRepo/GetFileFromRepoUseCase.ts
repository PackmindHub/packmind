import { GitRepo } from '@packmind/types';
import { GitProvider, GitProviderNotFoundError } from '@packmind/types';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { GitProviderService } from '../../GitProviderService';
import { PackmindLogger } from '@packmind/logger';

const origin = 'GetFileFromRepoUseCase';

export class GetFileFromRepoUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /**
   * Retrieves a file from the git repository and returns its decoded content.
   *
   * @param gitRepo - The git repository to fetch from
   * @param filePath - Path to the file in the repository
   * @param branch - Optional branch name (defaults to repository's default branch)
   * @returns Object containing file SHA and decoded UTF-8 content, or null if file not found
   * @throws Error if git provider is not found, token not configured, or content cannot be decoded
   */
  public async getFileFromRepo(
    gitRepo: GitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null> {
    this.logger.info('Getting file from git repository', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      filePath,
      branch,
    });

    const gitRepoInstance = await this.resolveGitRepoInstance(gitRepo);

    return this.readFile(gitRepo, gitRepoInstance, filePath, branch);
  }

  /**
   * Read several files over one provider client.
   *
   * Callers used to loop over getFileFromRepo, which re-read the provider row
   * and rebuilt the client for every path — the same repository, looked up
   * again each time. Resolving both once is the whole point of this method.
   */
  public async getFilesFromRepo(
    gitRepo: GitRepo,
    filePaths: string[],
    branch?: string,
  ): Promise<Map<string, { sha: string; content: string }>> {
    const uniquePaths = [...new Set(filePaths)];

    this.logger.info('Getting files from git repository', {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      fileCount: uniquePaths.length,
      branch,
    });

    const files = new Map<string, { sha: string; content: string }>();
    if (uniquePaths.length === 0) {
      return files;
    }

    const gitRepoInstance = await this.resolveGitRepoInstance(gitRepo);

    for (const filePath of uniquePaths) {
      // Per path, not per batch: the callers this replaced each swallowed a
      // failed read and carried on with the rest, and a publish that loses
      // every file's existing content because one of them failed would
      // overwrite rather than merge.
      try {
        const fileData = await this.readFile(
          gitRepo,
          gitRepoInstance,
          filePath,
          branch,
        );

        if (fileData) {
          files.set(filePath, fileData);
        }
      } catch (error) {
        this.logger.warn('Failed to read file from repository, skipping it', {
          owner: gitRepo.owner,
          repo: gitRepo.repo,
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return files;
  }

  private async resolveGitRepoInstance(gitRepo: GitRepo): Promise<IGitRepo> {
    // Fetch the git provider by ID
    const provider = await this.gitProviderService.findGitProviderById(
      gitRepo.providerId,
    );

    if (!provider) {
      throw new GitProviderNotFoundError(gitRepo.providerId);
    }

    // Create IGitRepo instance based on provider (token validation delegated to factory)
    return this.createGitRepoInstance(gitRepo, provider);
  }

  private async readFile(
    gitRepo: GitRepo,
    gitRepoInstance: IGitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null> {
    // Get file content from repository
    const fileData = await gitRepoInstance.getFileOnRepo(filePath, branch);

    if (fileData) {
      // Decode base64 content to readable string
      // Git providers (like GitHub API) return content in base64 encoding
      const decodedContent = Buffer.from(fileData.content, 'base64').toString(
        'utf-8',
      );

      this.logger.info('File retrieved and decoded successfully', {
        owner: gitRepo.owner,
        repo: gitRepo.repo,
        filePath,
        sha: fileData.sha,
        originalContentLength: fileData.content.length,
        decodedContentLength: decodedContent.length,
      });

      return {
        sha: fileData.sha,
        content: decodedContent,
      };
    } else {
      this.logger.info('File not found in repository', {
        owner: gitRepo.owner,
        repo: gitRepo.repo,
        filePath,
      });
    }

    return fileData;
  }

  private createGitRepoInstance(
    gitRepo: GitRepo,
    provider: GitProvider,
  ): Promise<IGitRepo> {
    return this.gitRepoFactory.createGitRepo(gitRepo, provider);
  }
}
