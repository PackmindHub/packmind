import {
  GitProvider,
  GitProviderId,
} from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';

export interface UpdateGitProviderUseCaseInput {
  id: GitProviderId;
  gitProvider: Partial<Omit<GitProvider, 'id'>>;
}

export class UpdateGitProviderUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(input: UpdateGitProviderUseCaseInput): Promise<GitProvider> {
    const { id, gitProvider } = input;

    // Business rule: id is required
    if (!id) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: gitProvider update data is required
    if (!gitProvider || Object.keys(gitProvider).length === 0) {
      throw new Error('Git provider update data is required');
    }

    return this.gitProviderService.updateGitProvider(id, gitProvider);
  }
}
