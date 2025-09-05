import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/shared';
import {
  IListOrganizationsUseCase,
  ListOrganizationsCommand,
  ListOrganizationsResponse,
} from '../../../domain/useCases/IListOrganizationsUseCase';

const origin = 'ListOrganizationsUseCase';

export class ListOrganizationsUseCase implements IListOrganizationsUseCase {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ListOrganizationsUseCase initialized');
  }

  async execute(
    _command: ListOrganizationsCommand, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ListOrganizationsResponse> {
    this.logger.info('Executing list organizations use case');

    try {
      const organizations = await this.organizationService.listOrganizations();

      this.logger.info('List organizations use case executed successfully', {
        count: organizations.length,
      });
      return { organizations };
    } catch (error) {
      this.logger.error('Failed to execute list organizations use case', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
