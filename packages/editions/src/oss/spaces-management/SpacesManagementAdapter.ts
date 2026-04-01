import {
  CreateSpaceResponse,
  ISpacesManagementPort,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
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
}
