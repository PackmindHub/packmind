import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
  ISpacesManagementPort,
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  JoinSpaceCommand,
  JoinSpaceBySlugCommand,
  JoinSpaceResponse,
  LeaveSpaceCommand,
  LeaveSpaceResponse,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
  DeleteSpaceCommand,
  DeleteSpaceResponse,
  PinSpaceCommand,
  PinSpaceResponse,
  UnpinSpaceCommand,
  UnpinSpaceResponse,
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

  async browseSpaces(
    command: BrowseSpacesCommand,
  ): Promise<BrowseSpacesResponse> {
    this.logger.info('Browsing spaces', {
      organizationId: command.organizationId,
    });
    return this.spacesManagementAdapter.browseSpaces(command);
  }

  async listOrganizationSpacesForManagement(
    command: ListOrganizationSpacesForManagementCommand,
  ): Promise<ListOrganizationSpacesForManagementResponse> {
    this.logger.info('Listing organization spaces for management', {
      organizationId: command.organizationId,
      page: command.page,
    });
    return this.spacesManagementAdapter.listOrganizationSpacesForManagement(
      command,
    );
  }

  async joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse> {
    this.logger.info('Joining space', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.joinSpace(command);
  }

  async joinSpaceBySlug(
    command: JoinSpaceBySlugCommand,
  ): Promise<JoinSpaceResponse> {
    this.logger.info('Joining space by slug', {
      organizationId: command.organizationId,
      spaceSlug: command.spaceSlug,
    });
    return this.spacesManagementAdapter.joinSpaceBySlug(command);
  }

  async leaveSpace(command: LeaveSpaceCommand): Promise<LeaveSpaceResponse> {
    this.logger.info('Leaving space', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.leaveSpace(command);
  }

  async updateSpace(command: UpdateSpaceCommand): Promise<UpdateSpaceResponse> {
    this.logger.info('Updating space', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.updateSpace(command);
  }

  async deleteSpace(command: DeleteSpaceCommand): Promise<DeleteSpaceResponse> {
    this.logger.info('Deleting space', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.deleteSpace(command);
  }

  async pinSpace(command: PinSpaceCommand): Promise<PinSpaceResponse> {
    this.logger.info('Pinning space', {
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.pinSpace(command);
  }

  async unpinSpace(command: UnpinSpaceCommand): Promise<UnpinSpaceResponse> {
    this.logger.info('Unpinning space', {
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.unpinSpace(command);
  }
}
