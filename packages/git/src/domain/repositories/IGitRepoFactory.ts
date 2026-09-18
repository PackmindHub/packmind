import { IGitRepo } from './IGitRepo';
import { GitProvider } from '@packmind/types';
import { GitRepo } from '@packmind/types';

export interface IGitRepoFactory {
  /** @throws Error if the provider source is unsupported. */
  createGitRepo(gitRepo: GitRepo, provider: GitProvider): Promise<IGitRepo>;
}
