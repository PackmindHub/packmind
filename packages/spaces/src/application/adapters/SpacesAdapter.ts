import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse,
  CreateSpaceCommand,
  CreateSpaceResponse,
  GetDefaultSpaceCommand,
  GetDefaultSpaceResponse,
  IAccountsPort,
  IAccountsPortName,
  ISpacesPort,
  ListSpaceMembersCommand,
  ListSpaceMembersResponse,
  ListUserSpacesCommand,
  ListUserSpacesResponse,
  OrganizationId,
  RemoveMemberFromSpaceCommand,
  RemoveMemberFromSpaceResponse,
  Space,
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse,
  SpaceId,
  SpaceType,
  UserId,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';

import type { SpacesHexa } from '../../SpacesHexa';
import { AddMembersToSpaceUseCase } from '../usecases/AddMembersToSpaceUseCase';
import { CreateSpaceUseCase } from '../usecases/CreateSpaceUseCase';
import { GetDefaultSpaceUseCase } from '../usecases/GetDefaultSpaceUseCase';
import { ListSpaceMembersUseCase } from '../usecases/ListSpaceMembersUseCase';
import { ListUserSpacesUseCase } from '../usecases/ListUserSpacesUseCase';
import { RemoveMemberFromSpaceUseCase } from '../usecases/RemoveMemberFromSpaceUseCase';
import { UpdateMemberRoleUseCase } from '../usecases/UpdateMemberRoleUseCase';

/**
 * SpacesAdapter - Implements the ISpacesPort interface for cross-domain access
 * Following the Port/Adapter pattern from DDD monorepo architecture standard
 */
export class SpacesAdapter implements IBaseAdapter<ISpacesPort>, ISpacesPort {
  private accountsPort!: IAccountsPort;
  private eventEmitterService!: PackmindEventEmitterService;

  constructor(private readonly hexa: SpacesHexa) {}

  async createDefaultSpace(organizationId: OrganizationId): Promise<Space> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.createDefaultSpace(organizationId);
  }

  async createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse> {
    const spaceService = this.hexa.getSpaceService();
    const useCase = new CreateSpaceUseCase(
      spaceService,
      this.accountsPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  async listSpacesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Space[]> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.listSpacesByOrganization(organizationId);
  }

  async getSpaceBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.getSpaceBySlug(slug, organizationId);
  }

  async getSpaceById(spaceId: SpaceId): Promise<Space | null> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.getSpaceById(spaceId);
  }

  async listUserSpaces(
    command: ListUserSpacesCommand,
  ): Promise<ListUserSpacesResponse> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    const useCase = new ListUserSpacesUseCase(membershipService);
    return useCase.execute(command);
  }

  async getDefaultSpace(
    command: GetDefaultSpaceCommand,
  ): Promise<GetDefaultSpaceResponse> {
    const spaceService = this.hexa.getSpaceService();
    const useCase = new GetDefaultSpaceUseCase(spaceService, this.accountsPort);
    return useCase.execute(command);
  }

  async addMemberToDefaultSpace(
    userId: UserId,
    organizationId: OrganizationId,
    role: UserSpaceRole,
    createdBy: UserId,
  ): Promise<UserSpaceMembership> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    return membershipService.addMemberToDefaultSpace(
      userId,
      organizationId,
      role,
      createdBy,
    );
  }

  async addSpaceMembership(membership: {
    userId: UserId;
    spaceId: SpaceId;
    role: UserSpaceRole;
    createdBy: UserId;
  }): Promise<UserSpaceMembership> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    return membershipService.addSpaceMembership(membership);
  }

  async removeUserFromOrganizationSpaces(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    return membershipService.removeUserFromOrganizationSpaces(
      userId,
      organizationId,
    );
  }

  async findMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<UserSpaceMembership | null> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    return membershipService.findMembership(userId, spaceId);
  }

  async findMembershipsByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<UserSpaceMembership[]> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    return membershipService.findMembershipsByUserAndOrganization(
      userId,
      organizationId,
    );
  }

  async listSpaceMembers(
    command: ListSpaceMembersCommand,
  ): Promise<ListSpaceMembersResponse> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    const useCase = new ListSpaceMembersUseCase(
      membershipService,
      this,
      this.accountsPort,
    );
    return useCase.execute(command);
  }

  async addMembersToSpace(
    command: AddMembersToSpaceCommand,
  ): Promise<AddMembersToSpaceResponse> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    const useCase = new AddMembersToSpaceUseCase(
      this,
      membershipService,
      this.accountsPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  async removeMemberFromSpace(
    command: RemoveMemberFromSpaceCommand,
  ): Promise<RemoveMemberFromSpaceResponse> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    const useCase = new RemoveMemberFromSpaceUseCase(
      this,
      membershipService,
      this.accountsPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  async updateSpace(
    spaceId: SpaceId,
    fields: { name?: string; type?: SpaceType },
  ): Promise<Space> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.updateSpace(spaceId, fields);
  }

  async updateMemberRole(
    command: UpdateMemberRoleCommand,
  ): Promise<UpdateMemberRoleResponse> {
    const membershipService = this.hexa.getUserSpaceMembershipService();
    const useCase = new UpdateMemberRoleUseCase(
      this,
      membershipService,
      this.accountsPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  /**
   * Initialize the adapter with ports from registry.
   */
  public async initialize(ports: Record<string, unknown>): Promise<void> {
    this.accountsPort = ports[IAccountsPortName] as IAccountsPort;
    this.eventEmitterService = ports[
      'eventEmitterService'
    ] as PackmindEventEmitterService;
  }

  /**
   * Check if the adapter is ready to use.
   */
  public isReady(): boolean {
    return !!this.accountsPort && !!this.eventEmitterService;
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ISpacesPort {
    return this as ISpacesPort;
  }
}
