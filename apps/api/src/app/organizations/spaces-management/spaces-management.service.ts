import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
  ISpacesPort,
} from '@packmind/types';
import { InjectSpacesAdapter } from '../../shared/HexaInjection';

@Injectable()
export class SpacesManagementService {
  constructor(
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
    private readonly logger: PackmindLogger,
  ) {}

  async createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse> {
    this.logger.info('Creating space', {
      organizationId: command.organizationId,
    });
    return this.spacesAdapter.createSpace(command);
  }
}
