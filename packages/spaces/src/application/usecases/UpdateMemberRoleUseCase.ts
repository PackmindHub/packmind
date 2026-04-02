import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse,
} from '@packmind/types';
import { CannotUpdateOwnRoleError } from '../../domain/errors/CannotUpdateOwnRoleError';
import { MemberNotFoundError } from '../../domain/errors/MemberNotFoundError';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import {
  AbstractSpaceAdminUseCase,
  SpaceAdminContext,
} from './AbstractSpaceAdminUseCase';

const origin = 'UpdateMemberRoleUseCase';

export class UpdateMemberRoleUseCase extends AbstractSpaceAdminUseCase<
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse
> {
  constructor(
    membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(membershipService, accountsPort, logger);
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

    return { updated };
  }
}
