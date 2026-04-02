import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ListSpaceMembersCommand,
  ListSpaceMembersResponse,
} from '@packmind/types';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

const origin = 'ListSpaceMembersUseCase';

export class ListSpaceMembersUseCase extends AbstractMemberUseCase<
  ListSpaceMembersCommand,
  ListSpaceMembersResponse
> {
  constructor(
    private readonly membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListSpaceMembersCommand & MemberContext,
  ): Promise<ListSpaceMembersResponse> {
    return this.membershipService.listSpaceMembers(command.spaceId);
  }
}
