import {
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
  MissingGitInputError,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';

export class FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase implements IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase {
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<FindGitRepoByOwnerRepoAndBranchInOrganizationResult> {
    const { owner, repo, branch, organizationId } = command;

    if (!owner) {
      throw new MissingGitInputError('Repository owner');
    }

    if (!repo) {
      throw new MissingGitInputError('Repository name');
    }

    if (!branch) {
      throw new MissingGitInputError('Branch name');
    }

    if (!organizationId) {
      throw new MissingGitInputError('Organization ID');
    }

    const gitRepo =
      await this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
        owner,
        repo,
        branch,
        organizationId,
      );
    return { gitRepo };
  }
}
