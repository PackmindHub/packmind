import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/logger';
import {
  IGetOrganizationByIdUseCase,
  GetOrganizationByIdCommand,
  GetOrganizationByIdResponse,
} from '@packmind/types';

const origin = 'GetOrganizationByIdUseCase';

export class GetOrganizationByIdUseCase implements IGetOrganizationByIdUseCase {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetOrganizationByIdUseCase initialized');
  }

  async execute(
    command: GetOrganizationByIdCommand,
  ): Promise<GetOrganizationByIdResponse> {
    const { organizationId } = command;

    this.logger.info('Executing get organization by ID use case', {
      organizationId,
    });

    try {
      const organization =
        await this.organizationService.getOrganizationById(organizationId);

      this.logger.info(
        'Get organization by ID use case executed successfully',
        {
          organizationId,
          found: !!organization,
        },
      );
      return { organization };
    } catch (error) {
      this.logger.error('Failed to execute get organization by ID use case', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
