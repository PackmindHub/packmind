import {
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
} from '../../../domain/useCases/IFindGitRepoByOwnerRepoAndBranchInOrganization';
import { GitRepoService } from '../../GitRepoService';

export class FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase implements IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase {
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<FindGitRepoByOwnerRepoAndBranchInOrganizationResult> {
    const { owner, repo, branch, organizationId } = command;

    if (!owner || !repo || !branch || !organizationId) {
      throw new Error(
        'Owner, repository name, branch, and organization ID are required',
      );
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
