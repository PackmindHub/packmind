import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProviderId } from '../GitProvider';
import { GitRepoId } from '../GitRepoId';

export type DeleteGitRepoCommand = PackmindCommand & {
  repositoryId: GitRepoId;
  providerId?: GitProviderId;
};

export type DeleteGitRepoResponse = Record<string, never>;

export type IDeleteGitRepoUseCase = IUseCase<
  DeleteGitRepoCommand,
  DeleteGitRepoResponse
>;
