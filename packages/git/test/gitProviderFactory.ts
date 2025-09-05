import { Factory } from '@packmind/shared/test';
import {
  GitProvider,
  GitProviderVendors,
  createGitProviderId,
} from '../src/domain/entities/GitProvider';
import { createOrganizationId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

export const gitProviderFactory: Factory<GitProvider> = (
  gitProvider?: Partial<GitProvider>,
) => {
  return {
    id: createGitProviderId(uuidv4()),
    source: GitProviderVendors.github,
    organizationId: createOrganizationId(uuidv4()),
    url: 'https://api.github.com',
    token: 'test-token',
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
    ...gitProvider,
  };
};
