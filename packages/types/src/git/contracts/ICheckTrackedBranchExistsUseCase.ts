import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitRepoId } from '../GitRepoId';

export type CheckTrackedBranchExistsCommand = PackmindCommand & {
  repositoryId: GitRepoId;
};

export type CheckTrackedBranchExistsResponse = {
  exists: boolean;
};

export type ICheckTrackedBranchExistsUseCase = IUseCase<
  CheckTrackedBranchExistsCommand,
  CheckTrackedBranchExistsResponse
>;
