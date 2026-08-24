import { Attributes } from '@opentelemetry/api';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  ISpacesPort,
  PackmindResult,
  SpaceAdminCommand,
  UserSpaceRole,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';

const defaultOrigin = 'AbstractSpaceAdminUseCase';

export type SpaceAdminContext = MemberContext;

export class SpaceAdminRequiredError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} is not an admin of space ${spaceId}`);
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

  protected override spanAttributes(command: Command): Attributes {
    return {
      ...super.spanAttributes(command),
      // Spread conditionally: spaceId is optional on some commands. The SDK
      // does drop undefined attribute values silently, but relying on that
      // makes a reader check OTel internals to know an absent space is fine.
      ...(command.spaceId && { 'packmind.space.id': command.spaceId }),
    };
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
