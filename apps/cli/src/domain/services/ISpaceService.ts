import { Space } from '@packmind/types';

export interface ISpaceService {
  getDefaultSpace: () => Promise<Space>;
  getSpaces: () => Promise<Space[]>;
}
