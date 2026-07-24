import {
  GitProvider,
  GitProviderId,
  GitProviderVendor,
  GitRepo,
  ListAvailableReposResponse,
  ListProvidersResponse,
} from '@packmind/types';

export type AddGitConnectionInput = {
  source: GitProviderVendor;
  displayName: string;
  token: string;
  url: string | null;
};

export interface IGitGateway {
  listProviders(): Promise<ListProvidersResponse>;
  addProvider(input: AddGitConnectionInput): Promise<GitProvider>;
  listReposByProvider(gitProviderId: GitProviderId): Promise<GitRepo[]>;
  listAvailableRepos(
    gitProviderId: GitProviderId,
    page?: number,
  ): Promise<ListAvailableReposResponse>;
}
