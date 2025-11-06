import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider } from '../GitProvider';

export type AddGitProviderCommand = PackmindCommand & {
  gitProvider: Omit<GitProvider, 'id' | 'organizationId'>;
};

export type IAddGitProviderUseCase = IUseCase<
  AddGitProviderCommand,
  GitProvider
>;
