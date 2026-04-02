import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  PackmindCommand,
  PackmindResult,
  SpaceId,
  UserSpaceRole,
} from '@packmind/types';
import { SpaceAdminRequiredError } from '../../domain/errors/SpaceAdminRequiredError';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

const defaultOrigin = 'AbstractSpaceAdminUseCase';

export type SpaceAdminCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type SpaceAdminContext = MemberContext;

export abstract class AbstractSpaceAdminUseCase<
  Command extends SpaceAdminCommand,
  Result extends PackmindResult,
> extends AbstractMemberUseCase<Command, Result> {
  constructor(
    protected readonly membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(defaultOrigin),
  ) {
    super(accountsPort, logger);
  }

  protected override async executeForMembers(
    command: Command & MemberContext,
  ): Promise<Result> {
    const callerMembership = await this.membershipService.findMembership(
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
