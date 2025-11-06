import { Space } from '@packmind/types';

export interface ISpacesGateway {
  getSpaces(orgId: string): Promise<Space[]>;
  getSpaceBySlug(slug: string, orgId: string): Promise<Space>;
}
