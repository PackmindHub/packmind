import { Gateway, IListUserSpaces, Space } from '@packmind/types';

export interface ISpacesGateway {
  getUserSpaces: Gateway<IListUserSpaces>;
  getGlobal(): Promise<Space>;
}
