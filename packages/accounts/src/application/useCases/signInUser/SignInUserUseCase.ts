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
    // Validate organization exists first
    const organization = await this.organizationService.getOrganizationById(
      command.organizationId,
    );
    if (!organization) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find user by username
    const user = await this.userService.getUserByUsername(command.username);
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

    // Validate user belongs to the specified organization
    if (user.organizationId !== command.organizationId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user,
      organization,
    };
  }
}
