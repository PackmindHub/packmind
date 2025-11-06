import { PackmindCommand, IUseCase } from '@packmind/types';
import { GitProviderId } from '../GitProvider';

export type ListAvailableReposCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
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

export type IListAvailableReposUseCase = IUseCase<
  ListAvailableReposCommand,
  ExternalRepository[]
>;
