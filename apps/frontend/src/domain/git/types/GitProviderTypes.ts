import {
  GitProviderAuthMethod,
  GitProviderId,
  GitProviderVendor,
  GitRepoId,
  OrganizationId,
} from '@packmind/types';

// Re-export the shared type so other UI code can import it from this module.
export type { GitProviderAuthMethod };

// Available git provider types for UI
export enum GitProviders {
  GITHUB = 'github',
  GITLAB = 'gitlab',
}

// Frontend-specific GitProvider interface for UI
export interface GitProviderUI {
  id: GitProviderId;
  source: GitProviderVendor;
  organizationId: OrganizationId;
  hasToken: boolean;
  url: string | null;
  repos?: GitRepoUI[];
  authMethod?: GitProviderAuthMethod;
}

// Frontend-specific GitRepo interface for UI
export interface GitRepoUI {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
  provider?: GitProviderUI;
}

// Form data types for creating new providers
export interface CreateGitProviderForm {
  source: GitProviderVendor;
  url: string;
  // For source === 'gitlab' or source === 'github' + authMethod === 'token'.
  token: string;
  // GitHub-only. Defaults to 'token' to preserve existing behaviour for GitLab.
  authMethod?: GitProviderAuthMethod;
  // Only meaningful when source === 'github' && authMethod === 'app'.
  appId?: number;
  appInstallationId?: number;
  appPrivateKey?: string;
}

// Form data types for adding repositories
export interface AddRepositoryForm {
  owner: string;
  name: string;
  branch: string;
}

// Available repository from external provider
export interface AvailableRepository {
  owner: string;
  name: string;
  fullName: string; // computed field: owner/name
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  stars: number;
}

// Repository selection with branch info
export interface RepositorySelection {
  repository: AvailableRepository;
  selectedBranch: string;
}
