import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddGitProviderCommand,
  GitProvider,
  IAccountsPort,
  IAddGitProviderUseCase,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';

// Re-export for backward compatibility
export { AddGitProviderCommand };

const origin = 'AddGitProviderUseCase';

export class AddGitProviderUseCase
  extends AbstractMemberUseCase<AddGitProviderCommand, GitProvider>
  implements IAddGitProviderUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: AddGitProviderCommand & MemberContext,
  ): Promise<GitProvider> {
    const {
      gitProvider,
      organization,
      allowTokenlessProvider = false,
    } = command;

    // Business rule: git provider must have a token configured (unless explicitly allowed)
    if (!gitProvider.token && !allowTokenlessProvider) {
      throw new Error('Git provider token is required');
    }

    if (!gitProvider.source) {
      throw new Error('Git provider source is required');
    }

    const gitProviderWithOrg = {
      ...gitProvider,
      organizationId: organization.id,
    };

    return this.gitProviderService.addGitProvider(gitProviderWithOrg);
  }
}
