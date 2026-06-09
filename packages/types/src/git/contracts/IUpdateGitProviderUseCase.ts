import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider, GitProviderId } from '../GitProvider';

export type UpdateGitProviderCommand = PackmindCommand & {
  id: GitProviderId;
  gitProvider: Partial<Omit<GitProvider, 'id'>>;
};

export type UpdateGitProviderResponse = GitProvider;

export type IUpdateGitProviderUseCase = IUseCase<
  UpdateGitProviderCommand,
  UpdateGitProviderResponse
>;
