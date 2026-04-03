import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  RemoveMemberFromSpaceCommand,
  RemoveMemberFromSpaceResponse,
} from '@packmind/types';
import { CannotRemoveFromDefaultSpaceError } from '../../domain/errors/CannotRemoveFromDefaultSpaceError';
import { CannotRemoveSelfError } from '../../domain/errors/CannotRemoveSelfError';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import {
  AbstractSpaceAdminUseCase,
  SpaceAdminContext,
} from './AbstractSpaceAdminUseCase';

const origin = 'RemoveMemberFromSpaceUseCase';

export class RemoveMemberFromSpaceUseCase extends AbstractSpaceAdminUseCase<
  RemoveMemberFromSpaceCommand,
  RemoveMemberFromSpaceResponse
> {
  constructor(
    membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(membershipService, accountsPort, logger);
  }

  protected async executeForSpaceAdmins(
    command: RemoveMemberFromSpaceCommand & SpaceAdminContext,
  ): Promise<RemoveMemberFromSpaceResponse> {
    const space = await this.membershipService.getSpaceById(command.spaceId);

    if (space?.isDefaultSpace) {
      throw new CannotRemoveFromDefaultSpaceError(command.spaceId);
    }

    if (command.userId === (command.targetUserId as string)) {
      throw new CannotRemoveSelfError(command.userId, command.spaceId);
    }

    const removed = await this.membershipService.removeSpaceMembership(
      command.targetUserId,
      command.spaceId,
    );

    return { removed };
  }
}
