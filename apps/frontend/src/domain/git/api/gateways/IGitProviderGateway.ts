import {
  CheckDirectoryExistenceResult,
  CheckProviderAuthResponse,
  GitProviderId,
  GitProviderWithoutToken,
  GitRepoId,
  IListAvailableReposUseCase,
  IListProvidersUseCase,
  NewGateway,
  OrganizationId,
} from '@packmind/types';
import {
  GitProviderUI,
  GitRepoUI,
  CreateGitProviderForm,
  AddRepositoryForm,
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
    gitProviderId?: GitProviderId,
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
    linkedProviderCount: number;
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
  getAvailableRepositories: NewGateway<IListAvailableReposUseCase>;
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

  // Auth probe
  checkProviderAuth(
    organizationId: OrganizationId,
    providerId: GitProviderId,
  ): Promise<CheckProviderAuthResponse>;

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
