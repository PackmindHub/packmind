import {
  GitRepo,
  FileModification,
  GitCommit,
  GitProvider,
  GitProviderNotFoundError,
  DeleteItem,
  DeleteItemType,
} from '@packmind/types';
import { IGitRepo, CommitFile } from '../../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../../domain/repositories/IGitRepoFactory';
import { GitCommitService } from '../../services/GitCommitService';
import { GitProviderService } from '../../GitProviderService';
import { PackmindLogger } from '@packmind/logger';
import { mergeSectionsIntoFileContent } from '@packmind/node-utils';

const origin = 'CommitToGitUseCase';

export class CommitToGitUseCase {
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
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
      throw new GitProviderNotFoundError(repo.providerId);
    }

    // Create IGitRepo instance based on provider (token validation delegated to factory)
    const gitRepoInstance = await this.createGitRepoInstance(repo, provider);

    // Process files to handle section-based updates
    const processedFiles: CommitFile[] = [];
    const filesToDelete: DeleteItem[] = [];

    for (const file of files) {
      if (file.content !== undefined) {
        // File has full content, use it directly
        processedFiles.push({
          path: file.path,
          content: file.content,
          permissions: file.skillFilePermissions,
        });
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
          processedFiles.push({
            path: file.path,
            content: mergedContent,
            permissions: file.skillFilePermissions,
          });
        }
      }
    }

    // Combine passed-in deleteFiles with files that became empty
    const allFilesToDelete = [...(deleteFiles ?? []), ...filesToDelete];

    // Directory deletions are expanded in one call rather than one per
    // directory. The previous `for … of` with an `await` inside asked the
    // provider once per directory, and on GitHub each of those asks walks
    // `ref -> commit -> tree?recursive=1` and filters a listing of the whole
    // repository down to a single directory - so 112 directories cost 336
    // sequential requests to answer what one tree already answered.
    const expandedFilesToDelete: DeleteItem[] = [];
    const directoryPaths: string[] = [];

    for (const deleteFile of allFilesToDelete) {
      if (deleteFile.type === DeleteItemType.Directory) {
        directoryPaths.push(deleteFile.path);
      } else {
        expandedFilesToDelete.push(deleteFile);
      }
    }

    if (directoryPaths.length > 0) {
      const filesInDirectories = await gitRepoInstance.listFilesInDirectories(
        directoryPaths,
        repo.branch,
      );
      expandedFilesToDelete.push(
        ...filesInDirectories.map((file) => ({
          path: file.path,
          type: DeleteItemType.File,
        })),
      );
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
  ): Promise<IGitRepo> {
    return this.gitRepoFactory.createGitRepo(repo, provider);
  }
}
