import {
  ISpacesManagementPort,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
} from '@packmind/types';

export class SpacesManagementAdapter implements ISpacesManagementPort {
  async moveArtifactsToSpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse> {
    return { movedCount: 0 };
  }
}
