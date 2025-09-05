import { OrganizationId } from '@packmind/accounts/types';
import { GitProviderId, GitRepoId } from '@packmind/git/types';

// Available git provider types for UI
export enum GitProviders {
  GITHUB = 'github',
  GITLAB = 'gitlab',
}

// Frontend-specific GitProvider interface for UI
export interface GitProviderUI {
  id: GitProviderId;
  source: GitProviders;
  organizationId: OrganizationId;
  token: string | null;
  url: string | null;
  repos?: GitRepoUI[];
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
  source: GitProviders;
  token: string;
  url: string;
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
