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

  async execute(command: SignUpUserCommand): Promise<User> {
    const { username, password, organizationId } = command;

    this.logger.info('Executing sign up user use case', {
      username,
      organizationId,
    });

    try {
      // First, validate that the organization exists
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
        username,
        password,
        organizationId,
      );

      this.logger.info('User signed up successfully', {
        userId: user.id,
        username,
        organizationId,
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to sign up user', {
        username,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
