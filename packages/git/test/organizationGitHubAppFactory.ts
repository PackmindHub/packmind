import { Factory } from '@packmind/test-utils';
import {
  OrganizationGitHubApp,
  createOrganizationGitHubAppId,
  createOrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const organizationGitHubAppFactory: Factory<OrganizationGitHubApp> = (
  app?: Partial<OrganizationGitHubApp>,
) => {
  return {
    id: createOrganizationGitHubAppId(uuidv4()),
    organizationId: createOrganizationId(uuidv4()),
    appId: 123456,
    appSlug: 'test-packmind-app',
    appClientId: 'Iv1.test-client-id',
    appClientSecret: 'test-client-secret',
    appPrivateKey:
      '-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----',
    appWebhookSecret: 'test-webhook-secret',
    revokedAt: null,
    ...app,
  };
};
