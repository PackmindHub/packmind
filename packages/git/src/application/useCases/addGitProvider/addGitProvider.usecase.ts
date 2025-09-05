import { GitProvider } from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';
import { OrganizationId } from '@packmind/accounts';

export interface AddGitProviderUseCaseInput {
  gitProvider: Omit<GitProvider, 'id' | 'organizationId'>;
  organizationId: OrganizationId;
}

export class AddGitProviderUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(input: AddGitProviderUseCaseInput): Promise<GitProvider> {
    const { gitProvider, organizationId } = input;

    // Business rule: organizationId is required
    if (!organizationId) {
      throw new Error('Organization ID is required to add a git provider');
    }

    // Business rule: git provider must have a token
    if (!gitProvider.token) {
      throw new Error('Git provider token is required');
    }

    // Business rule: git provider must have a valid source
    if (!gitProvider.source) {
      throw new Error('Git provider source is required');
    }

    // Create the git provider with organization association
    const gitProviderWithOrg = {
      ...gitProvider,
      organizationId,
    };

    return this.gitProviderService.addGitProvider(gitProviderWithOrg);
  }
}
