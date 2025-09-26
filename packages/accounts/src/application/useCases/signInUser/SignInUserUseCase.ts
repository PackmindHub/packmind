import {
  ISignInUserUseCase,
  SignInUserCommand,
  SignInUserResponse,
} from '../../../domain/useCases/ISignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { UnauthorizedException } from '@nestjs/common';

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
  ) {}

  async execute(command: SignInUserCommand): Promise<SignInUserResponse> {
    // Find user by email (case-insensitive)
    const user = await this.userService.getUserByEmailCaseInsensitive(
      command.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      command.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has any memberships
    if (!user.memberships || user.memberships.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get the first membership and its organization
    const firstMembership = user.memberships[0];
    const organization = await this.organizationService.getOrganizationById(
      firstMembership.organizationId,
    );

    if (!organization) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user,
      organization,
      role: firstMembership.role,
    };
  }
}
