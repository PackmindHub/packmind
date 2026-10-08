import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type CheckProviderBranchExistsCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
};

export type CheckProviderBranchExistsResponse = {
  exists: boolean;
};

export type ICheckProviderBranchExistsUseCase = IUseCase<
  CheckProviderBranchExistsCommand,
  CheckProviderBranchExistsResponse
>;
