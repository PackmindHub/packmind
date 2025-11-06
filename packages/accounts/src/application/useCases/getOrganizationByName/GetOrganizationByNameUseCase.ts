import slug from 'slug';
import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/logger';
import {
  IGetOrganizationByNameUseCase,
  GetOrganizationByNameCommand,
  GetOrganizationByNameResponse,
} from '@packmind/types';

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
      // Slugify the name and search by slug
      const organizationSlug = slug(name);
      this.logger.debug('Slugified organization name for search', {
        originalName: name,
        slug: organizationSlug,
      });

      const organization =
        await this.organizationService.getOrganizationBySlug(organizationSlug);

      this.logger.info(
        'Get organization by name use case executed successfully',
        {
          name,
          slug: organizationSlug,
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
