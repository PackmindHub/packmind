import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/logger';
import { ISpacesPort } from '@packmind/shared/types';
import {
  ISignUpWithOrganizationUseCase,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
} from '@packmind/types';

const origin = 'SignUpWithOrganizationUseCase';

export class SignUpWithOrganizationUseCase
  implements ISignUpWithOrganizationUseCase
{
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly spacesPort?: ISpacesPort,
  ) {
    this.logger.info('SignUpWithOrganizationUseCase initialized');
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

  private validateOrganizationName(organizationName: string): void {
    if (!organizationName || organizationName.trim().length === 0) {
      throw new Error('Organization name is required');
    }
  }

  async execute(
    command: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    const { organizationName, email, password } = command;

    this.logger.info('Executing sign up with organization use case', {
      email,
      organizationName,
    });

    try {
      // Validate inputs
      this.logger.debug('Validating input parameters');
      this.validateOrganizationName(organizationName);
      this.validatePassword(password);

      // Step 1: Create organization first
      this.logger.debug('Creating organization', { organizationName });
      const organization = await this.organizationService.createOrganization(
        organizationName.trim(),
      );

      // Create default "Global" space for the organization
      if (this.spacesPort) {
        this.logger.info('Creating default Global space for organization', {
          organizationId: organization.id,
        });
        try {
          await this.spacesPort.createSpace('Global', organization.id);
          this.logger.info('Default Global space created successfully', {
            organizationId: organization.id,
          });
        } catch (error) {
          this.logger.error('Failed to create default Global space', {
            organizationId: organization.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const user = await this.userService.createUser(
        email,
        password,
        organization.id,
      );

      this.logger.info('User signed up with organization successfully', {
        userId: user.id,
        email,
        organizationId: organization.id,
        organizationName: organization.name,
      });

      return { user, organization };
    } catch (error) {
      this.logger.error('Failed to sign up user with organization', {
        email,
        organizationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
