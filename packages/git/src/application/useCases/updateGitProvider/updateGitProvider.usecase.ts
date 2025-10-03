import {
  GitProvider,
  GitProviderId,
} from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindCommand,
  PackmindLogger,
  UserProvider,
  OrganizationProvider,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
} from '@packmind/shared';

const origin = 'UpdateGitProviderUseCase';

export type UpdateGitProviderCommand = PackmindCommand & {
  id: GitProviderId;
  gitProvider: Partial<Omit<GitProvider, 'id'>>;
};

export class UpdateGitProviderUseCase extends AbstractAdminUseCase<
  UpdateGitProviderCommand,
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
    command: UpdateGitProviderCommand & AdminContext,
  ): Promise<GitProvider> {
    const { id, gitProvider, organization } = command;

    // Business rule: id is required
    if (!id) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: gitProvider update data is required
    if (!gitProvider || Object.keys(gitProvider).length === 0) {
      throw new Error('Git provider update data is required');
    }

    const existingProvider =
      await this.gitProviderService.findGitProviderById(id);

    if (!existingProvider) {
      throw new GitProviderNotFoundError(id);
    }

    if (existingProvider.organizationId !== organization.id) {
      throw new GitProviderOrganizationMismatchError(id, organization.id);
    }

    if (
      gitProvider.organizationId &&
      gitProvider.organizationId !== existingProvider.organizationId
    ) {
      throw new GitProviderOrganizationMismatchError(id, organization.id);
    }

    return this.gitProviderService.updateGitProvider(id, gitProvider);
  }
}
