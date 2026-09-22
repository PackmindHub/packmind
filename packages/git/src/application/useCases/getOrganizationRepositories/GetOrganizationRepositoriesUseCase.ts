import { GitRepo, MissingGitInputError } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';

export interface GetOrganizationRepositoriesUseCaseInput {
  organizationId: OrganizationId;
}

export class GetOrganizationRepositoriesUseCase {
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(
    input: GetOrganizationRepositoriesUseCaseInput,
  ): Promise<GitRepo[]> {
    const { organizationId } = input;

    if (!organizationId) {
      throw new MissingGitInputError('Organization ID');
    }

    return this.gitRepoService.findGitReposByOrganizationId(organizationId);
  }
}
