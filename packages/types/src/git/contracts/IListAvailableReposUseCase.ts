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
  repositories: ExternalRepository[];
};

export type IListAvailableReposUseCase = IUseCase<
  ListAvailableReposCommand,
  ListAvailableReposResponse
>;
