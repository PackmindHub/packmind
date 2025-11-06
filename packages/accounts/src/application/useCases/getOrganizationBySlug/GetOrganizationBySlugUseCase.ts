import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/logger';
import {
  IGetOrganizationBySlugUseCase,
  GetOrganizationBySlugCommand,
  GetOrganizationBySlugResponse,
} from '@packmind/types';

const origin = 'GetOrganizationBySlugUseCase';

export class GetOrganizationBySlugUseCase
  implements IGetOrganizationBySlugUseCase
{
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetOrganizationBySlugUseCase initialized');
  }

  async execute(
    command: GetOrganizationBySlugCommand,
  ): Promise<GetOrganizationBySlugResponse> {
    const { slug } = command;

    this.logger.info('Executing get organization by slug use case', {
      slug,
    });

    try {
      const organization =
        await this.organizationService.getOrganizationBySlug(slug);

      this.logger.info(
        'Get organization by slug use case executed successfully',
        {
          slug,
          found: !!organization,
        },
      );
      return { organization };
    } catch (error) {
      this.logger.error('Failed to execute get organization by slug use case', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
