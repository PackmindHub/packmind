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
  // True when a provider page failed partway through this batch. The
  // repositories listed are usable, but they are not everything this page
  // would have held — callers should offer a way to retry the remainder
  // rather than presenting the list as complete.
  partial: boolean;
};

export type IListAvailableReposUseCase = IUseCase<
  ListAvailableReposCommand,
  ListAvailableReposResponse
>;
