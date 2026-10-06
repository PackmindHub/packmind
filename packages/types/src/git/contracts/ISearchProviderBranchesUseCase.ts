import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type SearchProviderBranchesCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  search: string;
};

export type SearchProviderBranchesResponse = {
  branches: string[];
};

export type ISearchProviderBranchesUseCase = IUseCase<
  SearchProviderBranchesCommand,
  SearchProviderBranchesResponse
>;
