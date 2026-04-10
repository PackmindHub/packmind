import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  CreateSpaceResponse,
  ISpacesManagementPort,
  JoinSpaceBySlugCommand,
  JoinSpaceCommand,
  JoinSpaceResponse,
  LeaveSpaceCommand,
  LeaveSpaceResponse,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
} from '@packmind/types';

export class SpacesManagementAdapter implements ISpacesManagementPort {
  createSpace(): Promise<CreateSpaceResponse> {
    throw new Error('Method not implemented.');
  }

  async moveArtifactsToSpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse> {
    return { movedCount: 0 };
  }

  async browseSpaces(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: BrowseSpacesCommand,
  ): Promise<BrowseSpacesResponse> {
    return { mySpaces: [], allSpaces: [] };
  }

  async joinSpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: JoinSpaceCommand,
  ): Promise<JoinSpaceResponse> {
    return {} as JoinSpaceResponse;
  }

  async joinSpaceBySlug(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: JoinSpaceBySlugCommand,
  ): Promise<JoinSpaceResponse> {
    return {} as JoinSpaceResponse;
  }

  async updateSpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: UpdateSpaceCommand,
  ): Promise<UpdateSpaceResponse> {
    throw new Error('Method not implemented.');
  }

  async leaveSpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: LeaveSpaceCommand,
  ): Promise<LeaveSpaceResponse> {
    return {} as LeaveSpaceResponse;
  }
}
