import { OrganizationService } from '../../services/OrganizationService';
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
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('CreateOrganizationUseCase initialized');
  }

  async execute(
    command: CreateOrganizationCommand,
  ): Promise<CreateOrganizationResponse> {
    const { name } = command;

    this.logger.info('Executing create organization use case', { name });

    if (!name || name.trim().length === 0) {
      const error = new Error('Organization name is required');
      this.logger.error('Failed to execute create organization use case', {
        name,
        error: error.message,
      });
      throw error;
    }

    try {
      const organization = await this.organizationService.createOrganization(
        name.trim(),
      );

      this.logger.info('Create organization use case executed successfully', {
        organizationId: organization.id,
        name,
      });
      return { organization };
    } catch (error) {
      this.logger.error('Failed to execute create organization use case', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
