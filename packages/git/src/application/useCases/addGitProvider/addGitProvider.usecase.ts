import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindCommand,
  PackmindLogger,
  OrganizationProvider,
  UserProvider,
} from '@packmind/shared';
import { GitProvider } from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';

const origin = 'AddGitProviderUseCase';

export type AddGitProviderCommand = PackmindCommand & {
  gitProvider: Omit<GitProvider, 'id' | 'organizationId'>;
};

export class AddGitProviderUseCase extends AbstractAdminUseCase<
  AddGitProviderCommand,
  GitProvider
> {
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
