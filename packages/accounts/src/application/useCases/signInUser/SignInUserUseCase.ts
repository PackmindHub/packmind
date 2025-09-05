import {
  ISignInUserUseCase,
  SignInUserCommand,
  SignInUserResponse,
} from '../../../domain/useCases/ISignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
  ) {}

  async execute(command: SignInUserCommand): Promise<SignInUserResponse> {
    // Find user by username
    const user = await this.userService.getUserByUsername(command.username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      command.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Fetch organization data
    const organization = await this.organizationService.getOrganizationById(
      user.organizationId,
    );
    if (!organization) {
      throw new Error('User organization not found');
    }

    return {
      user,
      organization,
    };
  }
}
