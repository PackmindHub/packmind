import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceAdminUseCase,
  PackmindEventEmitterService,
  SpaceAdminContext,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceMembersRoleUpdatedEvent,
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse,
} from '@packmind/types';
import { CannotUpdateOwnRoleError } from '../../domain/errors/CannotUpdateOwnRoleError';
import { MemberNotFoundError } from '../../domain/errors/MemberNotFoundError';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

const origin = 'UpdateMemberRoleUseCase';

export class UpdateMemberRoleUseCase extends AbstractSpaceAdminUseCase<
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    private readonly membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected async executeForSpaceAdmins(
    command: UpdateMemberRoleCommand & SpaceAdminContext,
  ): Promise<UpdateMemberRoleResponse> {
    if (command.userId === (command.targetUserId as string)) {
      throw new CannotUpdateOwnRoleError(command.userId, command.spaceId);
    }

    const targetMembership = await this.membershipService.findMembership(
      command.targetUserId,
      command.spaceId,
    );
    if (!targetMembership) {
      throw new MemberNotFoundError(command.targetUserId, command.spaceId);
    }

    const updated = await this.membershipService.updateMembershipRole(
      command.targetUserId,
      command.spaceId,
      command.role,
    );

    if (updated) {
      this.eventEmitterService.emit(
        new SpaceMembersRoleUpdatedEvent({
          userId: createUserId(command.userId),
          organizationId: createOrganizationId(command.organizationId),
          source: command.source ?? 'ui',
          spaceId: command.spaceId,
          memberUserIds: [command.targetUserId],
          newRole: command.role,
        }),
      );
    }

    return { updated };
  }
}
