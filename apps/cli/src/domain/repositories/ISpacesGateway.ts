import { Gateway, IListUserSpaces } from '@packmind/types';

export interface ISpacesGateway {
  getUserSpaces: Gateway<IListUserSpaces>;
}
