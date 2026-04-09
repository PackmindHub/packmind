import { Space } from '@packmind/types';

export interface ISpaceService {
  getDefaultSpace: () => Promise<Space>;
  getSpaces: () => Promise<Space[]>;
  getSpaceBySlug: (slug: string) => Promise<Space | null>;
  getApiContext: () => { host: string; organizationId: string };
}
