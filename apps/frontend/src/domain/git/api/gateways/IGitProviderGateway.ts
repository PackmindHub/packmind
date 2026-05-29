import {
  CheckDirectoryExistenceResult,
  GitProviderId,
  GitProviderWithoutToken,
  GitRepoId,
  IListProvidersUseCase,
  NewGateway,
  OrganizationId,
} from '@packmind/types';
import {
  GitProviderUI,
  GitRepoUI,
  CreateGitProviderForm,
  AddRepositoryForm,
  AvailableRepository,
} from '../../types/GitProviderTypes';
import { GitHubAppManifest } from '../../types/GitHubAppManifest';

export interface IGitProviderGateway {
  // Git Provider CRUD operations
  getGitProviders: NewGateway<IListProvidersUseCase>;
  getGitProviderById(
    organizationId: OrganizationId,
    id: GitProviderId,
  ): Promise<GitProviderUI>;
  getGithubAppInstallUrl(
    organizationId: OrganizationId,
  ): Promise<{ installUrl: string; state: string }>;
  getGithubAppManifest(organizationId: OrganizationId): Promise<{
    manifest: GitHubAppManifest;
    state: string;
    manifestPostUrl: string;
  }>;
  getGithubAppStatus(organizationId: OrganizationId): Promise<{
    hasApp: boolean;
    appSlug?: string;
    revokedAt?: Date | null;
  }>;
  revokeGithubApp(organizationId: OrganizationId): Promise<void>;
  submitGithubAppCallback(
    organizationId: OrganizationId,
    body: { installationId: number; state: string },
  ): Promise<GitProviderWithoutToken>;
  submitGithubAppManifestCallback(
    organizationId: OrganizationId,
    body: { code: string; state: string },
  ): Promise<{ installUrl: string }>;
  createGitProvider(
    organizationId: OrganizationId,
    data: CreateGitProviderForm,
  ): Promise<GitProviderUI>;
  updateGitProvider(
    organizationId: OrganizationId,
    id: GitProviderId,
    data: Partial<CreateGitProviderForm>,
  ): Promise<GitProviderUI>;
  deleteGitProvider(
    organizationId: OrganizationId,
    id: GitProviderId,
  ): Promise<void>;

  // Repository operations
  getRepositoriesByProvider(
    organizationId: OrganizationId,
    providerId: GitProviderId,
  ): Promise<GitRepoUI[]>;
  getAvailableRepositories(
    organizationId: OrganizationId,
    providerId: GitProviderId,
  ): Promise<AvailableRepository[]>;
  addRepositoryToProvider(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    data: AddRepositoryForm,
  ): Promise<GitRepoUI>;
  removeRepositoryFromProvider(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    repoId: GitRepoId,
  ): Promise<void>;

  // Branch operations
  checkBranchExists(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean>;

  // Target operations
  getAvailableRemoteDirectories(
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    path?: string,
  ): Promise<string[]>;

  // Directory operations
  checkDirectoryExistence(
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    directoryPath: string,
    branch: string,
  ): Promise<CheckDirectoryExistenceResult>;
}
