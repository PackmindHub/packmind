import { GitProvider } from '../GitProvider';
import { GitRepo } from '../GitRepo';
import { GitRepoId } from '../GitRepoId';
import { GitCommit } from '../GitCommit';
import { OrganizationId } from '../../accounts/Organization';
import {
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult,
} from '../contracts';

export interface IGitPort {
  /**
   * List all git providers for an organization
   *
   * @param organizationId - The organization ID
   * @returns Promise of array of git providers
   */
  listProviders(organizationId: OrganizationId): Promise<GitProvider[]>;

  /**
   * Get all repositories for an organization
   *
   * @param organizationId - The organization ID
   * @returns Promise of array of git repositories
   */
  getOrganizationRepositories(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]>;

  /**
   * Get a repository by its ID
   *
   * @param repositoryId - The repository ID
   * @returns Promise of git repository or null if not found
   */
  getRepositoryById(repositoryId: GitRepoId): Promise<GitRepo | null>;

  /**
   * Commit files to a git repository
   *
   * @param repo - The git repository
   * @param files - Array of files to commit with path and content
   * @param commitMessage - The commit message
   * @returns Promise of git commit
   */
  commitToGit(
    repo: GitRepo,
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<GitCommit>;

  /**
   * Get file content from a git repository
   *
   * @param gitRepo - The git repository
   * @param filePath - The path to the file
   * @param branch - Optional branch name (defaults to repository default branch)
   * @returns Promise of file data with sha and content, or null if file doesn't exist
   */
  getFileFromRepo(
    gitRepo: GitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null>;

  /**
   * Handle webhook payload for a git repository without fetching file content
   *
   * @param command - The webhook command
   * @returns Promise of webhook result with file paths but without content
   */
  handleWebHookWithoutContent(
    command: HandleWebHookWithoutContentCommand,
  ): Promise<HandleWebHookWithoutContentResult>;
}
