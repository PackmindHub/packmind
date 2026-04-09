import { Gateway, IListUserSpaces, Space } from '@packmind/types';

export interface ISpacesGateway {
  getUserSpaces: Gateway<IListUserSpaces>;
  getSpaceBySlug(slug: string): Promise<Space | null>;
  getApiContext(): { host: string; organizationId: string };
}
