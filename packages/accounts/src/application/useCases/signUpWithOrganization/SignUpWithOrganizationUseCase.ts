import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createUserId,
  ISignUpWithOrganizationUseCase,
  ISpacesPort,
  Organization,
  OrganizationCreatedEvent,
  OrganizationId,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  User,
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
    const { email, password, method } = command;
    this.logger.info('Executing sign up with organization use case', {
      email,
      method,
    });

    if (method === 'password') {
      this.validatePasswordForSignup(password);
    }

    const baseOrganizationName = this.generateBaseOrganizationName(email);

    try {
      const organizationName =
        await this.findUniqueOrganizationName(baseOrganizationName);

      const organization =
        await this.organizationService.createOrganization(organizationName);

      await this.tryCreateDefaultSpace(organization.id);

      let user;
      if (method === 'password') {
        user = await this.userService.createUser(
          email,
          password,
          organization.id,
        );
      } else if (method === 'social') {
        user = await this.createSocialUser(email, organization.id);
      } else {
        throw new Error(`Authentication type not found: ${method}`);
      }

      this.logger.info('User signed up with organization successfully', {
        userId: user.id,
        email,
        organizationId: organization.id,
        organizationName: organization.name,
        method,
      });

      this.emitSignUpEvents(user, organization, organizationName, command);

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

  private validatePasswordForSignup(password: string | undefined): void {
    if (!password) {
      throw new Error('Password is required');
    }
    this.validatePassword(password);
  }

  private async createSocialUser(
    email: string,
    organizationId: OrganizationId,
  ): Promise<User> {
    const user = await this.userService.createSocialLoginUser(email);
    return this.userService.addOrganizationMembership(
      user,
      organizationId,
      'admin',
    );
  }

  private async tryCreateDefaultSpace(
    organizationId: OrganizationId,
  ): Promise<void> {
    if (!this.spacesPort) {
      return;
    }

    this.logger.info('Creating default Global space for organization', {
      organizationId,
    });

    try {
      await this.spacesPort.createSpace('Global', organizationId);
      this.logger.info('Default Global space created successfully', {
        organizationId,
      });
    } catch (error) {
      this.logger.error('Failed to create default Global space', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private emitSignUpEvents(
    user: User,
    organization: Organization,
    organizationName: string,
    command: SignUpWithOrganizationCommand,
  ): void {
    this.eventEmitterService.emit(
      new UserSignedUpEvent({
        userId: createUserId(user.id),
        organizationId: organization.id,
        email: command.email,
        quickStart: false,
        source: 'ui',
        method: command.method,
        socialProvider: command.socialProvider ?? '',
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
  }
}
