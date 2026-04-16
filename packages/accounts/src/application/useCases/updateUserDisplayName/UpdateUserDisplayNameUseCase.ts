import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IUpdateUserDisplayNameUseCase,
  UpdateUserDisplayNameCommand,
  UpdateUserDisplayNameResponse,
} from '@packmind/types';
import { UserService } from '../../services/UserService';

const origin = 'UpdateUserDisplayNameUseCase';

export class UpdateUserDisplayNameUseCase
  extends AbstractMemberUseCase<
    UpdateUserDisplayNameCommand,
    UpdateUserDisplayNameResponse
  >
  implements IUpdateUserDisplayNameUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly userService: UserService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('UpdateUserDisplayNameUseCase initialized');
  }

  protected async executeForMembers(
    command: UpdateUserDisplayNameCommand & MemberContext,
  ): Promise<UpdateUserDisplayNameResponse> {
    const { user, displayName } = command;

    const trimmedDisplayName = displayName?.trim() || null;

    const updatedUser = await this.userService.updateUser({
      ...user,
      displayName: trimmedDisplayName,
    });

    return { displayName: updatedUser.displayName };
  }
}
