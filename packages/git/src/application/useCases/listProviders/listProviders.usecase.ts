import { GitProvider } from '../../../domain/entities/GitProvider';
import { OrganizationId } from '@packmind/accounts';
import { GitProviderService } from '../../GitProviderService';

export interface ListProvidersUseCaseInput {
  organizationId: OrganizationId;
}

export class ListProvidersUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(input: ListProvidersUseCaseInput): Promise<GitProvider[]> {
    const { organizationId } = input;

    // Business rule: organizationId is required
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.gitProviderService.findGitProvidersByOrganizationId(
      organizationId,
    );
  }
}
