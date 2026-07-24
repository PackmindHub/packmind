import { ListProvidersResponse } from '@packmind/types';

export interface IGitGateway {
  listProviders(): Promise<ListProvidersResponse>;
}
