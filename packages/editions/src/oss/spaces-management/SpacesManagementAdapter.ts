import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  CreateSpaceResponse,
  ISpacesManagementPort,
  JoinSpaceCommand,
  JoinSpaceResponse,
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

  async updateSpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: UpdateSpaceCommand,
  ): Promise<UpdateSpaceResponse> {
    throw new Error('Method not implemented.');
  }
}
