import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { ISpacesPort, OrganizationId, Space } from '@packmind/types';
import { InjectSpacesAdapter } from '../../shared/HexaInjection';

@Injectable()
export class SpacesManagementService {
  constructor(
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
    private readonly logger: PackmindLogger,
  ) {}

  async createSpace(
    name: string,
    organizationId: OrganizationId,
  ): Promise<Space> {
    this.logger.info('Creating space', { organizationId });
    return this.spacesAdapter.createSpace(name, organizationId, false);
  }
}
