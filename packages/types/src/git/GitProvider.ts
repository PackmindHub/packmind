import { Branded, brandedIdFactory } from '../brandedTypes';
import { Organization, OrganizationId } from '../accounts/Organization';
import { GitRepo } from './GitRepo';

export type GitProviderVendor = 'github' | 'gitlab' | 'unknown';

export const GitProviderVendors: Record<GitProviderVendor, GitProviderVendor> =
  {
    github: 'github',
    gitlab: 'gitlab',
    unknown: 'unknown',
  };

export type GitProviderId = Branded<'GitProviderId'>;
export const createGitProviderId = brandedIdFactory<GitProviderId>();

export type GitProviderAuthType = 'pat' | 'github_app';

export const GitProviderAuthTypes: Record<
  GitProviderAuthType,
  GitProviderAuthType
> = {
  pat: 'pat',
  github_app: 'github_app',
};

export type GitProvider = {
  id: GitProviderId;
  source: GitProviderVendor;
  organizationId: OrganizationId;
  url: string | null;
  token: string | null;
  /**
   * Defaults to 'pat' at the DB level — always present at runtime.
   * Optional in the TS type so existing literal mocks compile.
   */
  authType?: GitProviderAuthType;
  /**
   * GitHub App installation id when authType === 'github_app'. Null otherwise.
   */
  githubAppInstallationId?: number | null;
  organization?: Organization;
  repos?: GitRepo[];
};

export type GitProviderCredentialFields = Pick<
  GitProvider,
  'token' | 'authType' | 'githubAppInstallationId'
>;

export const gitProviderHasCredentials = (
  provider: GitProviderCredentialFields,
): boolean => {
  const hasPatToken =
    provider.token !== null &&
    provider.token !== undefined &&
    provider.token.length > 0;
  const hasGithubAppInstallation =
    provider.authType === GitProviderAuthTypes.github_app &&
    provider.githubAppInstallationId !== null &&
    provider.githubAppInstallationId !== undefined;
  return hasPatToken || hasGithubAppInstallation;
};
