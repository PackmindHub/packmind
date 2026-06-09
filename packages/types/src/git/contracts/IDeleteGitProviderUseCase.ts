import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type DeleteGitProviderCommand = PackmindCommand & {
  id: GitProviderId;
  force?: boolean;
};

export type DeleteGitProviderResponse = Record<string, never>;

export type IDeleteGitProviderUseCase = IUseCase<
  DeleteGitProviderCommand,
  DeleteGitProviderResponse
>;
