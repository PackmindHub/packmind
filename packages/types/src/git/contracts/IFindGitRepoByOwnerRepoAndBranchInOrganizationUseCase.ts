import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';
import { OrganizationId } from '../../accounts/Organization';

export type FindGitRepoByOwnerRepoAndBranchInOrganizationCommand =
  PackmindCommand & {
    owner: string;
    repo: string;
    branch: string;
    organizationId: OrganizationId;
  };

export type FindGitRepoByOwnerRepoAndBranchInOrganizationResult = {
  gitRepo: GitRepo | null;
};

export type IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase = IUseCase<
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult
>;
