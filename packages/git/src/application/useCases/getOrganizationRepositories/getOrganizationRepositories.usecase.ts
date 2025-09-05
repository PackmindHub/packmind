import { GitRepo } from '../../../domain/entities/GitRepo';
import { OrganizationId } from '@packmind/accounts';
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

    // Business rule: organizationId is required
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.gitRepoService.findGitReposByOrganizationId(organizationId);
  }
}
