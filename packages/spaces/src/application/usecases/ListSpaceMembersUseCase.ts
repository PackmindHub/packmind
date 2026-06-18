import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  MemberContext,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  ListSpaceMembersCommand,
  ListSpaceMembersResponse,
} from '@packmind/types';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

const origin = 'ListSpaceMembersUseCase';

export class ListSpaceMembersUseCase extends AbstractSpaceMemberUseCase<
  ListSpaceMembersCommand,
  ListSpaceMembersResponse
> {
  constructor(
    private readonly membershipService: UserSpaceMembershipService,
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected override async executeForMembers(
    command: ListSpaceMembersCommand & MemberContext,
  ): Promise<ListSpaceMembersResponse> {
    if (command.membership.role === 'admin') {
      return this.executeForSpaceMembers(command);
    }
    return super.executeForMembers(command);
  }

  protected async executeForSpaceMembers(
    command: ListSpaceMembersCommand & SpaceMemberContext,
  ): Promise<ListSpaceMembersResponse> {
    return this.membershipService.listSpaceMembers(command.spaceId);
  }
}
