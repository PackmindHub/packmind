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

export type GitProvider = {
  id: GitProviderId;
  source: GitProviderVendor;
  organizationId: OrganizationId;
  url: string | null;
  token: string | null;
  organization?: Organization;
  repos?: GitRepo[];
};
