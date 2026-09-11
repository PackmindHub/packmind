import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  ISpacesPort,
  PackmindResult,
  SpaceAdminCommand,
  UserSpaceRole,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';
import { SpaceContext, UserAccessError } from './UserAccessErrors';

const defaultOrigin = 'AbstractSpaceAdminUseCase';

export type SpaceAdminContext = MemberContext;

export class SpaceAdminRequiredError extends UserAccessError {
  constructor(userId: string, spaceId: string) {
    const context: SpaceContext = { userId, spaceId };
    super(
      'forbidden',
      'space_admin_required',
      context,
      'You must be an admin of this space to perform this action.',
    );
    this.name = 'SpaceAdminRequiredError';
  }
}

export abstract class AbstractSpaceAdminUseCase<
  Command extends SpaceAdminCommand,
  Result extends PackmindResult,
> extends AbstractMemberUseCase<Command, Result> {
  constructor(
    protected readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(defaultOrigin),
  ) {
    super(accountsPort, logger);
  }

  protected override async executeForMembers(
    command: Command & MemberContext,
  ): Promise<Result> {
    const callerMembership = await this.spacesPort.findMembership(
      command.user.id,
      command.spaceId,
    );

    if (!callerMembership || callerMembership.role !== UserSpaceRole.ADMIN) {
      throw new SpaceAdminRequiredError(command.userId, command.spaceId);
    }

    return this.executeForSpaceAdmins(command);
  }

  protected abstract executeForSpaceAdmins(
    command: Command & SpaceAdminContext,
  ): Promise<Result>;
}
