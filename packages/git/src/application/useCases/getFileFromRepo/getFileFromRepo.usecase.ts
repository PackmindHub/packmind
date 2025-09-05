import { GitRepo } from '../../../domain/entities/GitRepo';
import { GitProvider } from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';
import { PackmindLogger } from '@packmind/shared';
import { GithubRepository } from '../../../infra/repositories/github/GithubRepository';
import { GitlabRepository } from '../../../infra/repositories/gitlab/GitlabRepository';
import { GitProviderVendors } from '../../../domain/entities/GitProvider';

export class GetFileFromRepo {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly logger: PackmindLogger,
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

  private createGitRepoInstance(gitRepo: GitRepo, provider: GitProvider) {
    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    switch (provider.source) {
      case GitProviderVendors.github:
        return new GithubRepository(provider.token, {
          owner: gitRepo.owner,
          repo: gitRepo.repo,
          branch: gitRepo.branch,
        });
      case GitProviderVendors.gitlab:
        return new GitlabRepository(
          provider.token,
          {
            owner: gitRepo.owner,
            repo: gitRepo.repo,
            branch: gitRepo.branch,
          },
          this.logger,
          provider.url || undefined,
        );
      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }
}
