import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createUserId,
  ISignUpWithOrganizationUseCase,
  ISpacesPort,
  OrganizationCreatedEvent,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  UserSignedUpEvent,
} from '@packmind/types';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';

const origin = 'SignUpWithOrganizationUseCase';

export class SignUpWithOrganizationUseCase implements ISignUpWithOrganizationUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly spacesPort?: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
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

  private generateBaseOrganizationName(email: string): string {
    const localPart = email.split('@')[0];
    return `${localPart}'s organization`;
  }

  private async findUniqueOrganizationName(baseName: string): Promise<string> {
    let candidateName = baseName;
    let suffix = 1;

    while (
      await this.organizationService.getOrganizationByName(candidateName)
    ) {
      suffix++;
      candidateName = `${baseName} ${suffix}`;
    }

    return candidateName;
  }

  async execute(
    command: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    const { email, authType = 'password' } = command;

    this.logger.info('Executing sign up with organization use case', {
      email,
      authType,
    });

    const baseOrganizationName = this.generateBaseOrganizationName(email);

    try {
      const { password } = command;
      if (authType === 'password') {
        if (!password) {
          throw new Error('Password is required');
        }
        this.validatePassword(password);
      }

      const organizationName =
        await this.findUniqueOrganizationName(baseOrganizationName);

      const organization =
        await this.organizationService.createOrganization(organizationName);

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

      let user;
      if (authType === 'social') {
        user = await this.userService.createSocialLoginUser(email);
        user = await this.userService.addOrganizationMembership(
          user,
          organization.id,
          'admin',
        );
      } else {
        if (!password) {
          throw new Error('Password is required');
        }
        user = await this.userService.createUser(
          email,
          password,
          organization.id,
        );
      }

      this.logger.info('User signed up with organization successfully', {
        userId: user.id,
        email,
        organizationId: organization.id,
        organizationName: organization.name,
        authType,
      });

      this.eventEmitterService.emit(
        new UserSignedUpEvent({
          userId: createUserId(user.id),
          organizationId: organization.id,
          email,
          quickStart: false,
          source: 'ui',
        }),
      );

      this.eventEmitterService.emit(
        new OrganizationCreatedEvent({
          userId: createUserId(user.id),
          organizationId: organization.id,
          name: organizationName,
          method: 'sign-up',
          source: 'ui',
        }),
      );

      return { user, organization };
    } catch (error) {
      this.logger.error('Failed to sign up user with organization', {
        email,
        baseOrganizationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
