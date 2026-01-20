import {
  GitRepo,
  FileModification,
  GitCommit,
  GitProvider,
  DeleteItem,
  DeleteItemType,
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
    deleteFiles?: DeleteItem[],
  ): Promise<GitCommit> {
    this.logger.info('Committing multiple files to git repository', {
      owner: repo.owner,
      repo: repo.repo,
      fileCount: files.length,
      deleteFileCount: deleteFiles?.length ?? 0,
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
    const filesToDelete: DeleteItem[] = [];

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

        // Check if the merged content is empty
        if (mergedContent.trim() === '') {
          if (existingFile) {
            // File exists but would become empty after merge - mark for deletion
            this.logger.debug(
              'File would be empty after section merge, marking for deletion',
              { path: file.path },
            );
            filesToDelete.push({ path: file.path, type: DeleteItemType.File });
          }
          // If file didn't exist, skip it entirely (nothing to create or delete)
        } else {
          processedFiles.push({ path: file.path, content: mergedContent });
        }
      }
    }

    // Combine passed-in deleteFiles with files that became empty
    const allFilesToDelete = [...(deleteFiles ?? []), ...filesToDelete];

    const expandedFilesToDelete: DeleteItem[] = [];
    for (const deleteFile of allFilesToDelete) {
      if (deleteFile.type === DeleteItemType.Directory) {
        const filesInDir = await gitRepoInstance.listFilesInDirectory(
          deleteFile.path,
          repo.branch,
        );
        if (filesInDir.length > 0) {
          expandedFilesToDelete.push(
            ...filesInDir.map((f) => ({ ...f, type: DeleteItemType.File })),
          );
        }
      } else {
        expandedFilesToDelete.push(deleteFile);
      }
    }

    const createPaths = new Set(processedFiles.map((f) => f.path));
    const filteredFilesToDelete = expandedFilesToDelete.filter(
      (f) => !createPaths.has(f.path),
    );

    // Validate that we have something to commit (either files to update or delete)
    if (processedFiles.length === 0 && filteredFilesToDelete.length === 0) {
      throw new Error('No files to commit');
    }

    // Commit files to git repository and get commit data
    const commitData = await gitRepoInstance.commitFiles(
      processedFiles,
      commitMessage,
      filteredFilesToDelete.length > 0 ? filteredFilesToDelete : undefined,
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
