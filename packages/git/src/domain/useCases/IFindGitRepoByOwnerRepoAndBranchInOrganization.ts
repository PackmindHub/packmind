import { PackmindCommand, IUseCase } from '@packmind/shared';
import { GitRepo } from '../entities/GitRepo';
import { OrganizationId } from '@packmind/accounts';

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
