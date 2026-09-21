import { IGitProviderRepository } from './IGitProviderRepository';
import { IGitRepoRepository } from './IGitRepoRepository';
import { IGitCommitRepository } from './IGitCommitRepository';
import { IGitRepoFactory } from './IGitRepoFactory';
import { IGitProviderFactory } from './IGitProviderFactory';
import { IOrganizationGitHubAppRepository } from './IOrganizationGitHubAppRepository';

export interface IGitRepositories {
  getGitProviderRepository(): IGitProviderRepository;
  getGitRepoRepository(): IGitRepoRepository;
  getGitCommitRepository(): IGitCommitRepository;
  getGitRepoFactory(): IGitRepoFactory;
  getGitProviderFactory(): IGitProviderFactory;
  getOrganizationGitHubAppRepository(): IOrganizationGitHubAppRepository;
}
