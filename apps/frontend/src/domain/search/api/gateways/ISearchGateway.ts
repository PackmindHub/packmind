import { SearchResponse } from '@packmind/types';

export interface ISearchGateway {
  search(organizationId: string, query: string): Promise<SearchResponse>;
}
