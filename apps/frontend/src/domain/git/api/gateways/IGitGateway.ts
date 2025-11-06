import { OrganizationId } from '@packmind/types';

export type WebHooksResponse = {
  github: string;
  gitlab: string;
};

export interface IGitGateway {
  listWebHooks(
    organizationId: OrganizationId,
  ): Promise<WebHooksResponse | null>;
}
