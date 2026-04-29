import {
  CreateSpaceCommand,
  CreateSpaceResponse,
} from '../../spaces/contracts/ICreateSpaceUseCase';
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
} from '../contracts/IBrowseSpacesUseCase';
import {
  JoinSpaceCommand,
  JoinSpaceBySlugCommand,
  JoinSpaceResponse,
} from '../contracts/IJoinSpaceUseCase';
import {
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
} from '../contracts/IMoveArtifactsToSpaceUseCase';
import {
  UpdateSpaceCommand,
  UpdateSpaceResponse,
} from '../contracts/IUpdateSpaceUseCase';
import {
  LeaveSpaceCommand,
  LeaveSpaceResponse,
} from '../contracts/ILeaveSpaceUseCase';
import {
  DeleteSpaceCommand,
  DeleteSpaceResponse,
} from '../contracts/IDeleteSpaceUseCase';
import {
  PinSpaceCommand,
  PinSpaceResponse,
} from '../contracts/IPinSpaceUseCase';
import {
  UnpinSpaceCommand,
  UnpinSpaceResponse,
} from '../contracts/IUnpinSpaceUseCase';

/**
 * Port interface for cross-domain access to Spaces Management functionality
 * Following DDD monorepo architecture standard
 */
export const ISpacesManagementPortName = 'ISpacesManagementPort' as const;

export interface ISpacesManagementPort {
  /**
   * Create a space and add the creator as admin member.
   */
  createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse>;

  /**
   * Move artifacts (standards, skills, recipes) from one space to another.
   */
  moveArtifactsToSpace(
    command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse>;

  /**
   * Browse all spaces, returning the user's spaces and all discoverable spaces.
   */
  browseSpaces(command: BrowseSpacesCommand): Promise<BrowseSpacesResponse>;

  /**
   * Join a space by its ID.
   */
  joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse>;

  /**
   * Join a space by its slug within the organization.
   */
  joinSpaceBySlug(command: JoinSpaceBySlugCommand): Promise<JoinSpaceResponse>;

  /**
   * Update a space's settings (name, type, color).
   */
  updateSpace(command: UpdateSpaceCommand): Promise<UpdateSpaceResponse>;

  /**
   * Leave a space (user-initiated self-removal).
   */
  leaveSpace(command: LeaveSpaceCommand): Promise<LeaveSpaceResponse>;

  /**
   * Delete a space and all its memberships.
   */
  deleteSpace(command: DeleteSpaceCommand): Promise<DeleteSpaceResponse>;

  /**
   * Pin a space for the current user.
   */
  pinSpace(command: PinSpaceCommand): Promise<PinSpaceResponse>;

  /**
   * Unpin a space for the current user.
   */
  unpinSpace(command: UnpinSpaceCommand): Promise<UnpinSpaceResponse>;
}
