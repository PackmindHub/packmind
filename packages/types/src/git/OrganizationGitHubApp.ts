import { Branded, brandedIdFactory } from '../brandedTypes';
import { OrganizationId } from '../accounts/Organization';

export type OrganizationGitHubAppId = Branded<'OrganizationGitHubAppId'>;
export const createOrganizationGitHubAppId =
  brandedIdFactory<OrganizationGitHubAppId>();

export type OrganizationGitHubApp = {
  id: OrganizationGitHubAppId;
  organizationId: OrganizationId;
  appId: number;
  appSlug: string;
  appClientId: string;
  appClientSecret: string;
  appPrivateKey: string;
  appWebhookSecret: string;
  revokedAt?: Date | null;
};
