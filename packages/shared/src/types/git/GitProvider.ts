import { Branded, brandedIdFactory } from '../brandedTypes';
import { Organization, OrganizationId } from '../accounts';
import { GitRepo } from './GitRepo';

export type GitProviderVendor = 'github' | 'gitlab';

export const GitProviderVendors: Record<GitProviderVendor, GitProviderVendor> =
  {
    github: 'github',
    gitlab: 'gitlab',
  };

export type GitProviderId = Branded<'GitProviderId'>;
export const createGitProviderId = brandedIdFactory<GitProviderId>();

export type GitProvider = {
  id: GitProviderId;
  source: GitProviderVendor;
  organizationId: OrganizationId;
  url: string | null;
  token: string | null;
  // GitHub App authentication fields
  appId?: string | null;
  privateKey?: string | null;
  installationId?: string | null;
  organization?: Organization;
  repos?: GitRepo[];
};
