import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
  ISpacesManagementPort,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
} from '@packmind/types';
import { SpacesManagementHexa } from '../../SpacesManagementHexa';

@Injectable()
export class SpacesManagementService {
  constructor(
    private readonly spacesManagementHexa: SpacesManagementHexa,
    private readonly logger: PackmindLogger,
  ) {}

  private get spacesManagementAdapter(): ISpacesManagementPort {
    return this.spacesManagementHexa.getAdapter();
  }

  async createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse> {
    this.logger.info('Creating space', {
      organizationId: command.organizationId,
    });
    return this.spacesManagementAdapter.createSpace(command);
  }

  async moveArtifactsToSpace(
    command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse> {
    this.logger.info('Moving artifacts to space', {
      organizationId: command.organizationId,
      sourceSpaceId: command.sourceSpaceId,
      destinationSpaceId: command.destinationSpaceId,
    });
    return this.spacesManagementAdapter.moveArtifactsToSpace(command);
  }
}
