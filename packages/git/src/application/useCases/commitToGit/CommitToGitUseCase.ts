import {
  GitRepo,
  FileModification,
  GitCommit,
  DeleteItem,
  DeleteItemType,
} from '@packmind/types';
import { CommitFile } from '../../../domain/repositories/IGitRepo';
import { ResolvedGitRepoService } from '../../services/ResolvedGitRepoService';
import { GitCommitService } from '../../services/GitCommitService';
import { PackmindLogger } from '@packmind/logger';
import { mergeSectionsIntoFileContent } from '@packmind/node-utils';

const origin = 'CommitToGitUseCase';

export class CommitToGitUseCase {
  constructor(
    private readonly gitCommitService: GitCommitService,
    private readonly resolvedGitRepoService: ResolvedGitRepoService,
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

    if (!files.length) {
      throw new Error('No files to commit');
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(repo);

    const processedFiles: CommitFile[] = [];
    const filesToDelete: DeleteItem[] = [];

    for (const file of files) {
      if (file.content !== undefined) {
        processedFiles.push({
          path: file.path,
          content: file.content,
          permissions: file.skillFilePermissions,
        });
      } else if (file.sections !== undefined) {
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

        if (mergedContent.trim() === '') {
          if (existingFile) {
            this.logger.debug(
              'File would be empty after section merge, marking for deletion',
              { path: file.path },
            );
            filesToDelete.push({ path: file.path, type: DeleteItemType.File });
          }
          // No else: a file that never existed and merges to empty needs
          // neither a write nor a deletion.
        } else {
          processedFiles.push({
            path: file.path,
            content: mergedContent,
            permissions: file.skillFilePermissions,
          });
        }
      }
    }

    const allFilesToDelete = [...(deleteFiles ?? []), ...filesToDelete];

    // Directory paths are collected first and expanded in a single call: on
    // GitHub, asking per directory walks `ref -> commit -> tree?recursive=1`
    // each time, so the request count would grow with the number of
    // directories to answer what one recursive tree already answers.
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

    if (processedFiles.length === 0 && filteredFilesToDelete.length === 0) {
      throw new Error('No files to commit');
    }

    const commitData = await gitRepoInstance.commitFiles(
      processedFiles,
      commitMessage,
      filteredFilesToDelete.length > 0 ? filteredFilesToDelete : undefined,
    );

    // GitLab reports "nothing to commit" through this sentinel sha rather than
    // an error.
    if (commitData.sha === 'no-changes') {
      this.logger.info('No changes detected, skipping commit creation', {
        owner: repo.owner,
        repo: repo.repo,
        fileCount: files.length,
      });
      // Sentinel: deployment logic catches this rather than treating it as a
      // failure.
      throw new Error('NO_CHANGES_DETECTED');
    }

    return this.gitCommitService.addCommit(commitData);
  }
}
