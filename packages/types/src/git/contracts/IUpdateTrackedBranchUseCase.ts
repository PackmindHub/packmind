import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';

export type UpdateTrackedBranchCommand = PackmindCommand & {
  owner: string;
  repo: string;
  branch: string;
};

export type UpdateTrackedBranchResponse = GitRepo;

export type IUpdateTrackedBranchUseCase = IUseCase<
  UpdateTrackedBranchCommand,
  UpdateTrackedBranchResponse
>;
