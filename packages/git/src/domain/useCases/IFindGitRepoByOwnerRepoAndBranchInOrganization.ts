import { PackmindCommand, IUseCase } from '@packmind/types';
import { GitRepo } from '@packmind/types';
import { OrganizationId } from '@packmind/types';

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
