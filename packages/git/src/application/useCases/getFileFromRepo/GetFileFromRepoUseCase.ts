import { GitRepo } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { ResolvedGitRepoService } from '../../services/ResolvedGitRepoService';

const origin = 'GetFileFromRepoUseCase';

export class GetFileFromRepoUseCase {
  constructor(
    private readonly resolvedGitRepoService: ResolvedGitRepoService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

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
