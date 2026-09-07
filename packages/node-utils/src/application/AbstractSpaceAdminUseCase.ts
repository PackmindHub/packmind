import { PackmindLogger } from '@packmind/logger';
import {
  DomainError,
  IAccountsPort,
  ISpacesPort,
  PackmindResult,
  SpaceAdminCommand,
  UserSpaceRole,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';

const defaultOrigin = 'AbstractSpaceAdminUseCase';

export type SpaceAdminContext = MemberContext;

export class SpaceAdminRequiredError extends DomainError {
  readonly kind = 'forbidden' as const;
  readonly reason = 'space_admin_required' as const;

  /** The ids the check ran on, kept for logging rather than for the caller. */
  readonly context: { userId: string; spaceId: string };

  constructor(userId: string, spaceId: string) {
    super(
      'Only space admins can perform this action. Ask an admin of this space to do it for you.',
    );
    this.name = 'SpaceAdminRequiredError';
    this.context = { userId, spaceId };
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
