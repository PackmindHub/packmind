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
import {
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse,
} from '../contracts/IListOrganizationSpacesForManagementUseCase';

export const ISpacesManagementPortName = 'ISpacesManagementPort' as const;

export interface ISpacesManagementPort {
  /** Also adds the creator as an admin member. */
  createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse>;

  moveArtifactsToSpace(
    command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse>;

  /** Returns the user's own spaces and, separately, every space of the org. */
  browseSpaces(command: BrowseSpacesCommand): Promise<BrowseSpacesResponse>;

  joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse>;

  joinSpaceBySlug(command: JoinSpaceBySlugCommand): Promise<JoinSpaceResponse>;

  updateSpace(command: UpdateSpaceCommand): Promise<UpdateSpaceResponse>;

  /** Self-removal by the caller, as opposed to an admin removing a member. */
  leaveSpace(command: LeaveSpaceCommand): Promise<LeaveSpaceResponse>;

  /** Takes the space's memberships with it. */
  deleteSpace(command: DeleteSpaceCommand): Promise<DeleteSpaceResponse>;

  pinSpace(command: PinSpaceCommand): Promise<PinSpaceResponse>;

  unpinSpace(command: UnpinSpaceCommand): Promise<UnpinSpaceResponse>;

  /** Paginated, and enriched with admins, member counts and artifact counts. */
  listOrganizationSpacesForManagement(
    command: ListOrganizationSpacesForManagementCommand,
  ): Promise<ListOrganizationSpacesForManagementResponse>;
}
