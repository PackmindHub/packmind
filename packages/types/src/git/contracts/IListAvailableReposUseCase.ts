import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type ListAvailableReposCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  page?: number;
};

export type ExternalRepository = {
  name: string;
  owner: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  stars: number;
};

export type ListAvailableReposResponse = {
  currentPage: number;
  availablePages: number;
  // The last provider page fetched to build this batch. Because inaccessible
  // repos are filtered out, one requested page may span several provider pages;
  // callers resume pagination from `lastLoadedPage + 1`, not `currentPage + 1`.
  lastLoadedPage: number;
  repositories: ExternalRepository[];
};

export type IListAvailableReposUseCase = IUseCase<
  ListAvailableReposCommand,
  ListAvailableReposResponse
>;
