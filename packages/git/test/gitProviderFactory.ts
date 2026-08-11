import { Factory } from '@packmind/test-utils';
import {
  GitProvider,
  GitProviderVendors,
  createGitProviderId,
  createOrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const gitProviderFactory: Factory<GitProvider> = (
  gitProvider?: Partial<GitProvider>,
) => {
  return {
    id: createGitProviderId(uuidv4()),
    source: GitProviderVendors.github,
    organizationId: createOrganizationId(uuidv4()),
    // Web host, as the connection UI persists it — the GitHub API clients
    // hardcode api.github.com themselves and ignore this field.
    url: 'https://github.com',
    token: 'test-token',
    authMethod: 'token',
    displayName: '',
    ...gitProvider,
  };
};

export const gitlabProviderFactory: Factory<GitProvider> = (
  gitProvider?: Partial<GitProvider>,
) => {
  return {
    id: createGitProviderId(uuidv4()),
    source: GitProviderVendors.gitlab,
    organizationId: createOrganizationId(uuidv4()),
    url: 'https://gitlab.com',
    token: 'glpat-test-token',
    authMethod: 'token',
    displayName: '',
    ...gitProvider,
  };
};
