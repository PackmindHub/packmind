import { GitRepo } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { ResolvedGitRepoService } from '../../services/ResolvedGitRepoService';

const origin = 'GetFileFromRepoUseCase';

export class GetFileFromRepoUseCase {
  constructor(
    private readonly resolvedGitRepoService: ResolvedGitRepoService,
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

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);
    const fileData = await gitRepoInstance.getFileOnRepo(filePath, branch);

    if (fileData) {
      // Git providers return content base64-encoded.
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
}
