import { PackmindLogger } from '@packmind/logger';
import {
  GetOrganizationCreationPolicyCommand,
  GetOrganizationCreationPolicyResponse,
  IGetOrganizationCreationPolicyUseCase,
} from '@packmind/types';
import { UserService } from '../../services/UserService';
import { OrganizationCreationPolicyService } from '../../services/OrganizationCreationPolicyService';

const origin = 'GetOrganizationCreationPolicyUseCase';

export class GetOrganizationCreationPolicyUseCase implements IGetOrganizationCreationPolicyUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationCreationPolicyService: OrganizationCreationPolicyService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetOrganizationCreationPolicyUseCase initialized');
  }

  async execute(
    command: GetOrganizationCreationPolicyCommand,
  ): Promise<GetOrganizationCreationPolicyResponse> {
    const { userId } = command;

    // An unknown user id is evaluated as anonymous rather than failing.
    const user = userId ? await this.userService.getUserById(userId) : null;

    const canCreateOrganization =
      await this.organizationCreationPolicyService.canCreateOrganization(user);

    this.logger.info('Organization creation policy evaluated', {
      userId,
      canCreateOrganization,
    });

    return { canCreateOrganization };
  }
}
