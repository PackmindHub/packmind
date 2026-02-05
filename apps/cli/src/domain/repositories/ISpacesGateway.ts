import { Space } from '@packmind/types';

export interface ISpacesGateway {
  getGlobal(): Promise<Space>;
}
