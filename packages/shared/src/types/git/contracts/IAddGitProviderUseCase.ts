import { PackmindCommand, IUseCase } from '@packmind/types';
import { GitProvider } from '../GitProvider';

export type AddGitProviderCommand = PackmindCommand & {
  gitProvider: Omit<GitProvider, 'id' | 'organizationId'>;
};

export type IAddGitProviderUseCase = IUseCase<
  AddGitProviderCommand,
  GitProvider
>;
