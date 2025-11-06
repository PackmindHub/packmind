import { OrganizationId } from '@packmind/types';
import {
  GitProviderUI,
  GitRepoUI,
  CreateGitProviderForm,
  AddRepositoryForm,
  AvailableRepository,
} from '../../types/GitProviderTypes';
import { GitProviderId, GitRepoId } from '@packmind/git/types';
import { CheckDirectoryExistenceResult } from '@packmind/shared';

export interface IGitProviderGateway {
  // Git Provider CRUD operations
  getGitProviders(organizationId: OrganizationId): Promise<GitProviderUI[]>;
  getGitProviderById(id: GitProviderId): Promise<GitProviderUI>;
  createGitProvider(
    organizationId: OrganizationId,
    data: CreateGitProviderForm,
  ): Promise<GitProviderUI>;
  updateGitProvider(
    id: GitProviderId,
    data: Partial<CreateGitProviderForm>,
  ): Promise<GitProviderUI>;
  deleteGitProvider(id: GitProviderId): Promise<void>;

  // Repository operations
  getRepositoriesByProvider(providerId: GitProviderId): Promise<GitRepoUI[]>;
  getAvailableRepositories(
    providerId: GitProviderId,
  ): Promise<AvailableRepository[]>;
  addRepositoryToProvider(
    providerId: GitProviderId,
    data: AddRepositoryForm,
  ): Promise<GitRepoUI>;
  removeRepositoryFromProvider(
    providerId: GitProviderId,
    repoId: GitRepoId,
  ): Promise<void>;

  // Branch operations
  checkBranchExists(
    providerId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean>;

  // Target operations
  getAvailableRemoteDirectories(
    repositoryId: GitRepoId,
    path?: string,
  ): Promise<string[]>;

  // Directory operations
  checkDirectoryExistence(
    repositoryId: GitRepoId,
    directoryPath: string,
    branch: string,
  ): Promise<CheckDirectoryExistenceResult>;
}
