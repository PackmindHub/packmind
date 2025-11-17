import {
  GitRepo,
  FileModification,
  GitCommit,
  GitProvider,
} from '@packmind/types';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { GitCommitService } from '../../services/GitCommitService';
import { GitProviderService } from '../../GitProviderService';
import { PackmindLogger } from '@packmind/logger';
import { mergeSectionsIntoFileContent } from '@packmind/node-utils';

export class CommitToGit {
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger,
  ) {}

  public async commitToGit(
    repo: GitRepo,
    files: FileModification[],
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

    // Process files to handle section-based updates
    const processedFiles: { path: string; content: string }[] = [];

    for (const file of files) {
      if (file.content !== undefined) {
        // File has full content, use it directly
        processedFiles.push({ path: file.path, content: file.content });
      } else if (file.sections !== undefined) {
        // File has sections, fetch existing content and merge
        this.logger.debug('Processing file with sections', {
          path: file.path,
          sectionsCount: file.sections.length,
        });

        const existingFile = await gitRepoInstance.getFileOnRepo(
          file.path,
          repo.branch,
        );

        const existingContent = existingFile
          ? Buffer.from(existingFile.content, 'base64').toString('utf-8')
          : '';

        const mergedContent = mergeSectionsIntoFileContent(
          existingContent,
          file.sections,
        );

        processedFiles.push({ path: file.path, content: mergedContent });
      }
    }

    // Commit files to git repository and get commit data
    const commitData = await gitRepoInstance.commitFiles(
      processedFiles,
      commitMessage,
    );

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
    return this.gitRepoFactory.createGitRepo(repo, provider);
  }
}
