import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IUpdateUserDisplayNameUseCase,
  UpdateUserDisplayNameCommand,
  UpdateUserDisplayNameResponse,
} from '@packmind/types';
import { UserService } from '../../services/UserService';
import {
  InvalidDisplayNameError,
  MAX_DISPLAY_NAME_LENGTH,
} from '../../../domain/errors';

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

    const normalizedDisplayName = this.normalize(displayName);

    if (
      normalizedDisplayName !== null &&
      normalizedDisplayName.length > MAX_DISPLAY_NAME_LENGTH
    ) {
      throw InvalidDisplayNameError.tooLong();
    }

    const updatedUser = await this.userService.updateUser({
      ...user,
      displayName: normalizedDisplayName,
    });

    return { displayName: updatedUser.displayName };
  }

  private normalize(displayName: string | null): string | null {
    if (displayName === null) return null;
    const trimmed = displayName.trim().replace(/\s+/g, ' ');
    return trimmed || null;
  }
}
