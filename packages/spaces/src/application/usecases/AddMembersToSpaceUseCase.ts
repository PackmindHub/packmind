import { PackmindLogger } from '@packmind/logger';
import {
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse,
  IAccountsPort,
  UserSpaceMembership,
} from '@packmind/types';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import {
  AbstractSpaceAdminUseCase,
  SpaceAdminContext,
} from './AbstractSpaceAdminUseCase';

const origin = 'AddMembersToSpaceUseCase';

export class AddMembersToSpaceUseCase extends AbstractSpaceAdminUseCase<
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse
> {
  constructor(
    membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(membershipService, accountsPort, logger);
  }

  protected async executeForSpaceAdmins(
    command: AddMembersToSpaceCommand & SpaceAdminContext,
  ): Promise<AddMembersToSpaceResponse> {
    const createdMemberships: UserSpaceMembership[] = [];

    for (const member of command.members) {
      try {
        const membership = await this.membershipService.addSpaceMembership({
          userId: member.userId,
          spaceId: command.spaceId,
          role: member.role,
        });
        createdMemberships.push(membership);
      } catch (error) {
        this.logger.error('Failed to add member to space', {
          spaceId: command.spaceId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return createdMemberships;
  }
}
