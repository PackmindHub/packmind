import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/shared';
import {
  ICreateOrganizationUseCase,
  CreateOrganizationCommand,
  CreateOrganizationResponse,
} from '../../../domain/useCases/ICreateOrganizationUseCase';

const origin = 'CreateOrganizationUseCase';

export class CreateOrganizationUseCase implements ICreateOrganizationUseCase {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
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
      const error = new Error('Organization name is required');
      this.logger.error('Failed to execute create organization use case', {
        name,
        error: error.message,
      });
      throw error;
    }

    if (!userId) {
      const error = new Error('User ID is required');
      this.logger.error('Failed to execute create organization use case', {
        userId,
        error: error.message,
      });
      throw error;
    }

    try {
      const user = await this.userService.getUserById(userId);
      if (!user) {
        const error = new Error('User not found');
        this.logger.error('Failed to execute create organization use case', {
          userId,
          error: error.message,
        });
        throw error;
      }

      const organization = await this.organizationService.createOrganization(
        name.trim(),
      );

      await this.userService.addOrganizationMembership(
        user,
        organization.id,
        'admin',
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
