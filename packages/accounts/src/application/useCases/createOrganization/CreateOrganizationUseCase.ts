import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createUserId,
  ISpacesPort,
  OrganizationCreatedEvent,
  UserSpaceRole,
} from '@packmind/types';
import {
  ICreateOrganizationUseCase,
  CreateOrganizationCommand,
  CreateOrganizationResponse,
} from '@packmind/types';
import { UserNotFoundError } from '@packmind/node-utils';
import {
  InvalidOrganizationNameError,
  UserIdRequiredError,
} from '../../../domain/errors';

const origin = 'CreateOrganizationUseCase';

export class CreateOrganizationUseCase implements ICreateOrganizationUseCase {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly spacesPort: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('CreateOrganizationUseCase initialized');
  }

  async execute(
    command: CreateOrganizationCommand,
  ): Promise<CreateOrganizationResponse> {
    const { userId, name } = command;

    this.logger.info('Executing create organization use case', {
      userId,
      name,
    });

    if (!name || name.trim().length === 0) {
      throw new InvalidOrganizationNameError(name ?? '');
    }

    if (!userId) {
      throw new UserIdRequiredError();
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError({ userId });
    }

    try {
      const organization = await this.organizationService.createOrganization(
        name.trim(),
      );

      await this.userService.addOrganizationMembership(
        user,
        organization.id,
        'admin',
      );

      this.logger.info('Creating default Global space for organization', {
        organizationId: organization.id,
      });
      try {
        await this.spacesPort.createDefaultSpace(organization.id);
        this.logger.info('Default Global space created successfully', {
          organizationId: organization.id,
        });

        await this.spacesPort.addMemberToDefaultSpace(
          createUserId(userId),
          organization.id,
          UserSpaceRole.ADMIN,
          createUserId(userId),
        );
        this.logger.info(
          'User added to default space membership successfully',
          {
            userId,
            organizationId: organization.id,
          },
        );
      } catch (error) {
        this.logger.error('Failed to create default Global space', {
          organizationId: organization.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      this.eventEmitterService.emit(
        new OrganizationCreatedEvent({
          userId: createUserId(user.id),
          organizationId: organization.id,
          name,
          method: 'create',
          source: 'ui',
        }),
      );

      this.logger.info('Create organization use case executed successfully', {
        organizationId: organization.id,
        userId,
        name,
        role: 'admin',
      });
      return { organization };
    } catch (error) {
      this.logger.error('Failed to execute create organization use case', {
        userId,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
