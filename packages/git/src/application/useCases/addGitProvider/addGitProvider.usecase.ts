import { PackmindLogger } from '@packmind/logger';
import { OrganizationProvider, UserProvider } from '@packmind/types';
import { AbstractAdminUseCase, AdminContext } from '@packmind/shared';
import { AddGitProviderCommand, IAddGitProviderUseCase } from '@packmind/types';

// Re-export for backward compatibility
export { AddGitProviderCommand };
import { GitProvider } from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';

const origin = 'AddGitProviderUseCase';

export class AddGitProviderUseCase
  extends AbstractAdminUseCase<AddGitProviderCommand, GitProvider>
  implements IAddGitProviderUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
  }

  protected async executeForAdmins(
    command: AddGitProviderCommand & AdminContext,
  ): Promise<GitProvider> {
    const { gitProvider, organization } = command;

    if (!gitProvider.token) {
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
