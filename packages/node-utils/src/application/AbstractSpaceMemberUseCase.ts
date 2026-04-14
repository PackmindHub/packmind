import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  ISpacesPort,
  PackmindResult,
  SpaceMemberCommand,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';

const defaultOrigin = 'AbstractSpaceMemberUseCase';

export type SpaceMemberContext = MemberContext;

export class SpaceMembershipRequiredError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} is not a member of space ${spaceId}`);
    this.name = 'SpaceMembershipRequiredError';
  }
}

export abstract class AbstractSpaceMemberUseCase<
  Command extends SpaceMemberCommand,
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

    if (!callerMembership) {
      throw new SpaceMembershipRequiredError(command.userId, command.spaceId);
    }

    return this.executeForSpaceMembers(command);
  }

  protected abstract executeForSpaceMembers(
    command: Command & SpaceMemberContext,
  ): Promise<Result>;
}
