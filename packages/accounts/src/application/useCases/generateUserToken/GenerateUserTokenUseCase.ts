import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  GenerateUserTokenCommand,
  GenerateUserTokenResponse,
  IGenerateUserTokenUseCase,
} from '@packmind/types';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from '@packmind/node-utils';
import { OrganizationNotFoundError } from '../../../domain/errors';

export class GenerateUserTokenUseCase implements IGenerateUserTokenUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
  ) {}

  async execute(
    command: GenerateUserTokenCommand,
  ): Promise<GenerateUserTokenResponse> {
    const user = await this.userService.getUserById(command.userId);
    if (!user) {
      throw new UserNotFoundError({ userId: command.userId });
    }

    const membership = user.memberships.find(
      (item) => item.organizationId === command.organizationId,
    );
    if (!membership) {
      throw new UserNotInOrganizationError({
        userId: command.userId,
        organizationId: command.organizationId,
      });
    }

    const organization = await this.organizationService.getOrganizationById(
      command.organizationId,
    );
    if (!organization) {
      throw new OrganizationNotFoundError(command.organizationId);
    }

    return {
      user,
      organization,
      role: membership.role,
    };
  }
}
