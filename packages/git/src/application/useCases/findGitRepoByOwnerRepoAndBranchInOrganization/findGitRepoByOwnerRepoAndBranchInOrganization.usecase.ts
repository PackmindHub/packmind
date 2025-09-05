import {
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
} from '../../../domain/useCases/IFindGitRepoByOwnerRepoAndBranchInOrganization';
import { GitRepo } from '../../../domain/entities/GitRepo';
import { GitRepoService } from '../../GitRepoService';

export class FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase
  implements IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase
{
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<GitRepo | null> {
    const { owner, repo, branch, organizationId } = command;

    if (!owner || !repo || !branch || !organizationId) {
      throw new Error(
        'Owner, repository name, branch, and organization ID are required',
      );
    }

    return this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
      owner,
      repo,
      branch,
      organizationId,
    );
  }
}
