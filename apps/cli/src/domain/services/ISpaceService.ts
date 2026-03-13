import { Space } from '@packmind/types';

export interface ISpaceService {
  getGlobalSpace: () => Promise<Space>;
}
