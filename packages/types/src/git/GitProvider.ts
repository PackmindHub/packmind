import { Branded, brandedIdFactory } from '../brandedTypes';
import { Organization, OrganizationId } from '../accounts/Organization';
import { GitRepo } from './GitRepo';
import { OrganizationGitHubAppId } from './OrganizationGitHubApp';

export type GitProviderVendor = 'github' | 'gitlab' | 'unknown';

export const GitProviderVendors: Record<GitProviderVendor, GitProviderVendor> =
  {
    github: 'github',
    gitlab: 'gitlab',
    unknown: 'unknown',
  };

export type GitProviderId = Branded<'GitProviderId'>;
export const createGitProviderId = brandedIdFactory<GitProviderId>();

export type GitProviderAuthMethod = 'token' | 'app';

export const GitProviderAuthMethods: Record<
  GitProviderAuthMethod,
  GitProviderAuthMethod
> = {
  token: 'token',
  app: 'app',
};

export type GitProvider = {
  id: GitProviderId;
  source: GitProviderVendor;
  organizationId: OrganizationId;
  url: string | null;
  token: string | null;
  authMethod: GitProviderAuthMethod;
  appInstallationId?: number;
  // Required at the DB layer when authMethod === 'app' (enforced by a CHECK
  // constraint). Optional in TypeScript so token-auth providers can omit it.
  // Binds the provider to the specific OrganizationGitHubApp it was installed
  // against, so re-registering the manifest never silently rebinds it.
  organizationGitHubAppId?: OrganizationGitHubAppId | null;
  revokedAt?: Date | null;
  organization?: Organization;
  repos?: GitRepo[];
};
