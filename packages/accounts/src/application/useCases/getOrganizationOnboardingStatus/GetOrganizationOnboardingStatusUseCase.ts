import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindLogger,
  UserProvider,
  OrganizationProvider,
  IStandardsPort,
  IDeploymentPort,
  IGitPort,
  ISpacesPort,
} from '@packmind/shared';
import {
  IGetOrganizationOnboardingStatusUseCase,
  GetOrganizationOnboardingStatusCommand,
  OrganizationOnboardingStatus,
} from '@packmind/shared';
import { UserService } from '../../services/UserService';

const origin = 'GetOrganizationOnboardingStatusUseCase';

export class GetOrganizationOnboardingStatusUseCase
  extends AbstractMemberUseCase<
    GetOrganizationOnboardingStatusCommand,
    OrganizationOnboardingStatus
  >
  implements IGetOrganizationOnboardingStatusUseCase
{
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    private readonly userService: UserService,
    private readonly gitPort: IGitPort | null,
    private readonly standardsPort: IStandardsPort | null,
    private readonly spacesPort: ISpacesPort | null,
    private readonly deploymentPort: IDeploymentPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
    logger.info('GetOrganizationOnboardingStatusUseCase initialized');
  }

  async executeForMembers(
    command: GetOrganizationOnboardingStatusCommand & MemberContext,
  ): Promise<OrganizationOnboardingStatus> {
    const { organization, user, userId } = command;

    this.logger.info('Fetching organization onboarding status', {
      organizationId: organization.id,
      userId: user.id,
    });

    // Check if colleagues have been invited (more than 1 user in org)
    const users = await this.userService.listUsersByOrganization(
      organization.id,
    );
    const hasInvitedColleague = users.length > 1;

    // Check git providers
    let hasConnectedGitProvider = false;
    if (this.gitPort) {
      const gitProviders = await this.gitPort.listProviders(organization.id);
      hasConnectedGitProvider = gitProviders.length > 0;
    }

    // Check git repos
    let hasConnectedGitRepo = false;
    if (this.gitPort) {
      const gitRepos = await this.gitPort.getOrganizationRepositories(
        organization.id,
      );
      hasConnectedGitRepo = gitRepos.length > 0;
    }

    // Check standards across all spaces
    let hasCreatedStandard = false;
    if (this.standardsPort && this.spacesPort) {
      const spaces = await this.spacesPort.listSpacesByOrganization(
        organization.id,
      );
      const standardsPort = this.standardsPort;
      const standardsPerSpace = await Promise.all(
        spaces.map((space) =>
          standardsPort.listStandardsBySpace(space.id, organization.id, userId),
        ),
      );
      const allStandards = standardsPerSpace.flat();
      hasCreatedStandard = allStandards.length > 0;
    }

    // Check deployments
    let hasDeployed = false;
    if (this.deploymentPort) {
      const deploymentOverview =
        await this.deploymentPort.getDeploymentOverview({
          userId,
          organizationId: organization.id,
        });
      hasDeployed =
        deploymentOverview.repositories.length > 0 ||
        deploymentOverview.recipes.length > 0;
    }

    const status: OrganizationOnboardingStatus = {
      hasConnectedGitProvider,
      hasConnectedGitRepo,
      hasCreatedStandard,
      hasDeployed,
      hasInvitedColleague,
    };

    this.logger.info('Organization onboarding status fetched', {
      organizationId: organization.id,
      userId: user.id,
      status,
    });

    return status;
  }
}
