import { User } from '../../../domain/entities/User';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/shared';
import {
  ISignUpUserUseCase,
  SignUpUserCommand,
} from '../../../domain/useCases/ISignUpUserUseCase';

const origin = 'SignUpUserUseCase';

export class SignUpUserUseCase implements ISignUpUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('SignUpUserUseCase initialized');
  }

  private validatePassword(password: string): void {
    if (!password) {
      throw new Error('Password is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Count non-alphanumerical characters
    const nonAlphaNumCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;
    if (nonAlphaNumCount < 2) {
      throw new Error(
        'Password must contain at least 2 non-alphanumerical characters',
      );
    }
  }

  async execute(command: SignUpUserCommand): Promise<User> {
    const { email, password, organizationId } = command;

    this.logger.info('Executing sign up user use case', {
      email,
      organizationId,
    });

    try {
      // First, validate the password
      this.logger.debug('Validating password requirements');
      this.validatePassword(password);

      // Then, validate that the organization exists
      this.logger.debug('Validating organization exists', { organizationId });

      const organization =
        await this.organizationService.getOrganizationById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      this.logger.debug('Organization validated successfully', {
        organizationId,
        organizationName: organization.name,
      });

      // Now create the user
      const user = await this.userService.createUser(
        email,
        password,
        organizationId,
      );

      this.logger.info('User signed up successfully', {
        userId: user.id,
        email,
        organizationId,
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to sign up user', {
        email,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
