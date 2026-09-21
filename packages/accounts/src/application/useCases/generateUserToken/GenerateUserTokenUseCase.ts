import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  GenerateUserTokenCommand,
  GenerateUserTokenResponse,
  IGenerateUserTokenUseCase,
} from '@packmind/types';

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
      throw new Error('User not found');
    }

    const membership = user.memberships.find(
      (item) => item.organizationId === command.organizationId,
    );
    if (!membership) {
      throw new Error('User organization membership not found');
    }

    const organization = await this.organizationService.getOrganizationById(
      command.organizationId,
    );
    if (!organization) {
      throw new Error('User organization not found');
    }

    return {
      user,
      organization,
      role: membership.role,
    };
  }
}
