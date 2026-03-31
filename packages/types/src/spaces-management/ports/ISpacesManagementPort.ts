import {
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
} from '../contracts/IMoveArtifactsToSpaceUseCase';

/**
 * Port interface for cross-domain access to Spaces Management functionality
 * Following DDD monorepo architecture standard
 */
export const ISpacesManagementPortName = 'ISpacesManagementPort' as const;

export interface ISpacesManagementPort {
  /**
   * Move artifacts (standards, skills, recipes) from one space to another.
   */
  moveArtifactsToSpace(
    command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse>;
}
