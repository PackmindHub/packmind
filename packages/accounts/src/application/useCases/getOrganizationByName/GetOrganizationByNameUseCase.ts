import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/shared';
import {
  IGetOrganizationByNameUseCase,
  GetOrganizationByNameCommand,
  GetOrganizationByNameResponse,
} from '../../../domain/useCases/IGetOrganizationByNameUseCase';

const origin = 'GetOrganizationByNameUseCase';

export class GetOrganizationByNameUseCase
  implements IGetOrganizationByNameUseCase
{
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetOrganizationByNameUseCase initialized');
  }

  async execute(
    command: GetOrganizationByNameCommand,
  ): Promise<GetOrganizationByNameResponse> {
    const { name } = command;

    this.logger.info('Executing get organization by name use case', {
      name,
    });

    try {
      const organization =
        await this.organizationService.getOrganizationByName(name);

      this.logger.info(
        'Get organization by name use case executed successfully',
        {
          name,
          found: !!organization,
        },
      );
      return { organization };
    } catch (error) {
      this.logger.error('Failed to execute get organization by name use case', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
